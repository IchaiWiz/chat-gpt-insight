// options.js

const LOG_PREFIX = "[ChatGPT Exporter Settings]";

// Logger
const logger = {
  info: (msg) => console.log(`${LOG_PREFIX} ${msg}`),
  error: (msg, err) => console.error(`${LOG_PREFIX} ${msg}`, err),
  debug: (msg, data) => console.debug(`${LOG_PREFIX} ${msg}`, data || '')
};

// État local
const state = {
  isLoading: false,
  hasChanges: false,
  originalValues: null
};

document.addEventListener("DOMContentLoaded", () => {
  logger.debug('Initialisation options...');
  
  const checkIntervalInput = document.getElementById("checkInterval");
  const maxWaitTimeInput = document.getElementById("maxWaitTime");
  const checkEmailsInput = document.getElementById("checkEmails");
  const contactBtn = document.getElementById("contactBtn");
  const saveBtn = document.getElementById("saveBtn");
  const msg = document.getElementById("msg");

  // Appliquer les traductions
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = chrome.i18n.getMessage(key);
    if (translation) {
      if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    }
  });

  // Charger les valeurs
  loadSettings();

  // Gestionnaires d'événements
  checkIntervalInput.addEventListener("input", onInputChange);
  maxWaitTimeInput.addEventListener("input", onInputChange);
  checkEmailsInput.addEventListener("change", onCheckEmailsChange);
  contactBtn.addEventListener("click", onContactClick);
  saveBtn.addEventListener("click", onSaveClick);

  function onCheckEmailsChange(e) {
    const isChecked = e.target.checked;
    
    // Désactiver/activer les champs de timer en fonction de l'état
    checkIntervalInput.disabled = !isChecked;
    maxWaitTimeInput.disabled = !isChecked;
    
    onInputChange(e);
  }

  function onContactClick() {
    const email = "ichai.dev@gmail.com";
    const subject = chrome.i18n.getMessage("contactSubject");
    const body = chrome.i18n.getMessage("contactBody");
    
    // Copier l'email dans le presse-papier
    navigator.clipboard.writeText(email).then(() => {
      showMessage("emailCopiedSuccess", "success");
    });
    
    // Ouvrir le client mail
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function onInputChange(e) {
    const input = e.target;
    
    // Validation spécifique pour les champs numériques
    if (input.type === "number") {
      const value = parseInt(input.value, 10);
      if (value < parseInt(input.min) || value > parseInt(input.max)) {
        input.classList.add("invalid");
      } else {
        input.classList.remove("invalid");
      }
    }

    // Vérifier si les valeurs ont changé
    checkForChanges();
  }

  async function loadSettings() {
    try {
      state.isLoading = true;
      updateUI();

      const items = await new Promise(resolve => {
        chrome.storage.sync.get(
          { 
            checkInterval: 60, 
            maxWaitTime: 10,
            checkEmails: true
          },
          resolve
        );
      });

      logger.debug('Settings chargés:', items);
      
      // Sauvegarder les valeurs originales
      state.originalValues = { ...items };
      
      // Mettre à jour les inputs
      checkIntervalInput.value = items.checkInterval;
      maxWaitTimeInput.value = items.maxWaitTime;
      checkEmailsInput.checked = items.checkEmails;

      // Mettre à jour l'état des champs de timer
      checkIntervalInput.disabled = !items.checkEmails;
      maxWaitTimeInput.disabled = !items.checkEmails;

    } catch (err) {
      logger.error('Erreur chargement settings:', err);
      showMessage("errorLoading", "error");
    } finally {
      state.isLoading = false;
      updateUI();
    }
  }

  async function onSaveClick() {
    try {
      if (state.isLoading) return;
      
      state.isLoading = true;
      updateUI();

      // Récupérer et valider les valeurs
      const rawCheck = parseInt(checkIntervalInput.value, 10);
      const rawMax = parseInt(maxWaitTimeInput.value, 10);
      const checkEmails = checkEmailsInput.checked;

      if (isNaN(rawCheck) || isNaN(rawMax)) {
        throw new Error("invalidValuesError");
      }

      // Forcer dans les limites
      const finalCheck = Math.min(Math.max(rawCheck, 5), 300);
      const finalMax = Math.min(Math.max(rawMax, 5), 60);

      // Mettre à jour les inputs si les valeurs ont été ajustées
      checkIntervalInput.value = finalCheck;
      maxWaitTimeInput.value = finalMax;

      // Sauvegarder
      await new Promise(resolve => {
        chrome.storage.sync.set({
          checkInterval: finalCheck,
          maxWaitTime: finalMax,
          checkEmails: checkEmails
        }, resolve);
      });

      logger.info('Settings sauvegardés');
      
      // Mettre à jour les valeurs originales
      state.originalValues = { 
        checkInterval: finalCheck, 
        maxWaitTime: finalMax,
        checkEmails: checkEmails
      };
      state.hasChanges = false;
      
      // Afficher le message de succès
      showMessage("saveSuccess", "success");

    } catch (err) {
      logger.error('Erreur sauvegarde:', err);
      showMessage("invalidValuesError", "error");
    } finally {
      state.isLoading = false;
      updateUI();
    }
  }

  function checkForChanges() {
    if (!state.originalValues) return;

    const currentCheck = parseInt(checkIntervalInput.value, 10);
    const currentMax = parseInt(maxWaitTimeInput.value, 10);
    const currentEmailCheck = checkEmailsInput.checked;

    state.hasChanges = (
      currentCheck !== state.originalValues.checkInterval ||
      currentMax !== state.originalValues.maxWaitTime ||
      currentEmailCheck !== state.originalValues.checkEmails
    );

    updateUI();
  }

  function showMessage(key, type = "success") {
    const message = chrome.i18n.getMessage(key);
      
    msg.textContent = message;
    msg.className = ""; // Reset
    msg.classList.add(type);
    msg.classList.add("show");

    // Ajouter l'icône
    const icon = document.createElement("i");
    icon.className = type === "success" 
      ? "fas fa-check-circle"
      : "fas fa-exclamation-circle";
    msg.insertBefore(icon, msg.firstChild);

    // Cacher après délai
    setTimeout(() => {
      msg.classList.remove("show");
    }, 3000);
  }

  function updateUI() {
    // Bouton de sauvegarde
    saveBtn.disabled = state.isLoading || !state.hasChanges;
    
    if (state.isLoading) {
      saveBtn.classList.add("loading");
      saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${chrome.i18n.getMessage("loadingText")}`;
    } else {
      saveBtn.classList.remove("loading");
      saveBtn.innerHTML = `<i class="fas fa-save"></i> ${chrome.i18n.getMessage("saveButton")}`;
    }

    // Inputs
    checkEmailsInput.disabled = state.isLoading;
    
    // Les champs de timer sont gérés par onCheckEmailsChange
  }
});
