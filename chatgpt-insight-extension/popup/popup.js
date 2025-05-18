// popup.js

const LOG_PREFIX = "[ChatGPT Exporter]";

// Logger pour le popup
const logger = {
  info: (msg) => console.log(`${LOG_PREFIX} ${msg}`),
  error: (msg, err) => console.error(`${LOG_PREFIX} ${msg}`, err),
  debug: (msg, data) => console.debug(`${LOG_PREFIX} ${msg}`, data || ""),
};

// État local du popup
const state = {
  lastError: null,
  isLoading: false,
  lastStatus: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  logger.debug("Initialisation popup...");

  // Appliquer les traductions
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const translation = chrome.i18n.getMessage(key);
    if (translation) {
      if (element.tagName === "INPUT" && element.type === "text") {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    }
  });

  const exportBtn = document.getElementById("exportBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const openSettings = document.getElementById("openSettings");

  // Gestionnaires d'événements
  exportBtn.addEventListener("click", onExportClick);
  cancelBtn.addEventListener("click", onCancelClick);
  openSettings.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Récupérer l'état actuel du background
  const currentState = await sendMessageBG({ action: "getState" });

  // Vérifier s'il y a une recherche en cours dans le storage
  const searchState = await new Promise((resolve) => {
    chrome.storage.local.get("searchState", (result) =>
      resolve(result.searchState)
    );
  });

  // Rafraîchissement UI
  setInterval(refreshUI, 1000);
  refreshUI();
});

async function onExportClick() {
  try {
    state.isLoading = true;
    setStatus(chrome.i18n.getMessage("checkingExistingEmail"), "loading");
    logger.info("Vérification email existant...");

    // 1) Vérifier si un email non lu est disponible
    const resp = await sendMessageBG({ action: "checkEmailNow" });
    if (resp.error) {
      throw new Error(resp.error);
    }

    if (resp.downloadLink) {
      logger.info("Email trouvé, téléchargement direct");
      await downloadFile(resp.downloadLink);
      return;
    }

    // 2) Lancer l'export
    setStatus(chrome.i18n.getMessage("openingChatGPT"), "loading");
    logger.info("Démarrage export...");

    const exportResp = await sendMessageBG({ action: "startExport" });
    if (exportResp.error || exportResp.status !== "Exportation initiée") {
      throw new Error(
        exportResp.error ||
          exportResp.status ||
          chrome.i18n.getMessage("unknownError")
      );
    }

    // Vérifier si la recherche d'emails est activée
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get(
        {
          checkEmails: true,
          checkInterval: 5,
          maxWaitTime: 10,
        },
        resolve
      );
    });

    if (settings.checkEmails) {
      setStatus(chrome.i18n.getMessage("exportStartedWithSearch"), "info");
    } else {
      setStatus(chrome.i18n.getMessage("exportStartedNoSearch"), "info");
    }
  } catch (err) {
    logger.error("Erreur export:", err);
    state.lastError = err.message;
    setStatus(err.message, "error");
  } finally {
    state.isLoading = false;
  }
}

async function onCancelClick() {
  try {
    logger.info("Annulation recherche...");
    await sendMessageBG({ action: "cancelEmailPolling" });
    setStatus(chrome.i18n.getMessage("searchCanceled"), "info");
    refreshUI();
  } catch (err) {
    logger.error("Erreur annulation:", err);
    setStatus(chrome.i18n.getMessage("cancelError"), "error");
  }
}

async function refreshUI() {
  try {
    const {
      isExportInProgress,
      exportError,
      isSearching,
      currentAttempt,
      maxAttempts,
      intervalSec,
      endTime,
      nextCheckTime,
      lastError,
    } = await sendMessageBG({ action: "getState" });

    // Mise à jour des éléments UI
    const exportBtn = document.getElementById("exportBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const searchInfo = document.getElementById("searchInfo");
    const attemptCount = document.getElementById("attemptCount");
    const attemptMax = document.getElementById("attemptMax");
    const nextCheckEl = document.getElementById("nextCheck");
    const progressFill = document.getElementById("progressFill");

    // Gestion des erreurs
    if (exportError && exportError !== state.lastError) {
      state.lastError = exportError;
      setStatus(exportError, "error");
    }

    // États des boutons
    exportBtn.disabled = isExportInProgress || isSearching || state.isLoading;
    exportBtn.classList.toggle("loading", state.isLoading);

    cancelBtn.style.display = isSearching ? "block" : "none";
    cancelBtn.disabled = state.isLoading;

    // Infos de recherche
    searchInfo.style.display = isSearching ? "block" : "none";

    if (isSearching) {
      // Mise à jour compteurs
      attemptCount.textContent = currentAttempt;
      attemptMax.textContent = maxAttempts;

      // Barre de progression
      const totalInterval = intervalSec * 1000;
      const timePassedSinceLastCheck =
        Date.now() - (nextCheckTime - totalInterval);
      const ratio = Math.max(
        0,
        Math.min(timePassedSinceLastCheck / totalInterval, 1)
      );
      progressFill.style.width = `${ratio * 100}%`;

      // Compte à rebours
      const remainingSec = Math.floor((nextCheckTime - Date.now()) / 1000);
      nextCheckEl.textContent = remainingSec > 0 ? remainingSec : 0;

      // Préparer le nouveau statut seulement si différent du précédent
      if (!state.lastError) {
        state.lastStatus = chrome.i18n.getMessage("searchProgressStatus", [
          currentAttempt.toString(),
          maxAttempts.toString(),
        ]);
        setStatus(state.lastStatus, "loading");
      }
    } else {
      if (lastError) {
        setStatus(lastError, "error");
      } else if (currentAttempt > 0 && state.lastStatus !== "searchComplete") {
        setStatus(chrome.i18n.getMessage("searchComplete"), "success");
        state.lastStatus = "searchComplete";
      }
    }
  } catch (err) {
    logger.error("Erreur rafraîchissement UI:", err);
  }
}

async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    setStatus(chrome.i18n.getMessage("downloadInProgress"), "loading");
    logger.info("Démarrage téléchargement...");

    chrome.downloads.download(
      { url, filename: "chatgpt_data.zip", saveAs: false },
      (downloadId) => {
        if (chrome.runtime.lastError || !downloadId) {
          const error =
            chrome.runtime.lastError?.message ||
            chrome.i18n.getMessage("unknownError");
          logger.error("Erreur téléchargement:", error);
          setStatus(
            chrome.i18n.getMessage("downloadError", { error }),
            "error"
          );
          reject(new Error(error));
          return;
        }

        logger.info("Téléchargement réussi");
        setStatus(chrome.i18n.getMessage("downloadComplete"), "success");

        // Notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "/icons/icon128.png",
          title: "ChatGPT Exporter",
          message: chrome.i18n.getMessage("downloadSuccessNotification"),
        });

        resolve(downloadId);
      }
    );
  });
}

function setStatus(msg, type = "info") {
  const statusEl = document.getElementById("status");
  if (!statusEl) return;

  statusEl.textContent = msg;

  // Classes CSS pour les différents états
  statusEl.className = "status"; // Reset
  statusEl.classList.add(`status-${type}`);

  // Animation de changement
  statusEl.classList.add("status-update");
  setTimeout(() => statusEl.classList.remove("status-update"), 300);

  logger.debug(`Status mis à jour (${type}):`, msg);
}

function sendMessageBG(payload) {
  return new Promise((resolve) => {
    logger.debug("Envoi message background:", payload);
    chrome.runtime.sendMessage(payload, (response) => {
      logger.debug("Réponse background:", response);
      resolve(response);
    });
  });
}
