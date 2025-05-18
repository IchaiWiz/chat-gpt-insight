// background.js

const LOG_PREFIX = "[ChatGPT Exporter]";

// État global de l'extension
const state = {
  export: {
    tabId: null,
    inProgress: false,
    error: null
  },
  search: {
    isSearching: false,
    currentAttempt: 0,
    maxAttempts: 0,
    intervalSec: 60,
    endTime: 0,
    nextCheckTime: 0,
    nextTimeoutId: null,
    lastError: null,
    checkedEmailIds: new Set(), // Pour stocker les IDs des emails déjà vérifiés
    startTime: null // Pour stocker le moment où l'export a commencé
  }
};

// Logs améliorés
const logger = {
  info: (msg) => console.log(`${LOG_PREFIX} ${msg}`),
  error: (msg, err) => {
    console.error(`${LOG_PREFIX} ${msg}`, err);
    return err?.message || msg;
  },
  debug: (msg, data) => {
    if (data) {
      console.debug(`${LOG_PREFIX} ${msg}`, data);
    } else {
      console.debug(`${LOG_PREFIX} ${msg}`);
    }
  }
};

// Gestionnaire de messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug('Message reçu', request);

  const handlers = {
    getState: () => ({
      isExportInProgress: state.export.inProgress,
      exportError: state.export.error,
      ...state.search
    }),

    checkEmailNow: async () => {
      try {
        const link = await checkEmailNow();
        return { downloadLink: link };
      } catch (err) {
        const errMsg = logger.error('Erreur checkEmailNow:', err);
        return { downloadLink: null, error: errMsg };
      }
    },

    startExport: async () => {
      if (state.export.inProgress) {
        return { status: "Export déjà en cours" };
      }
      try {
        await startExport();
        return { status: "Exportation initiée" };
      } catch (err) {
        const errMsg = logger.error('Erreur startExport:', err);
        return { status: errMsg, error: true };
      }
    },

    exportSuccess: async () => {
      state.export.inProgress = false;
      state.export.error = null;
      logger.info('Export réussi');
      
      // Récupérer la configuration
      const config = await new Promise(resolve => {
        chrome.storage.sync.get(
          { 
            checkEmails: true,
            checkInterval: 5, // Valeur minimale par défaut
            maxWaitTime: 10
          },
          resolve
        );
      });

      if (config.checkEmails) {
        logger.info(`Vérification des emails activée, démarrage du polling (intervalle: ${config.checkInterval}s)...`);
        startEmailPolling(config.checkInterval, config.maxWaitTime);
      } else {
        logger.info('Vérification des emails désactivée');
      }
      
      return { status: "success" };
    },

    exportFailed: (msg) => {
      state.export.inProgress = false;
      state.export.error = msg.error;
      logger.error('Export échoué:', msg.error);
      return { status: "error" };
    },

    closeChatGptTab: () => {
      closeChatGptTab();
      return { status: "ok" };
    },

    startEmailPolling: (params) => {
      startEmailPolling(
        params.intervalSec,
        params.maxWaitMin,
        params.currentAttempt,
        params.nextCheckTime
      );
      return { started: true };
    },

    cancelEmailPolling: () => {
      stopEmailPolling();
      return { canceled: true };
    }
  };

  const handler = handlers[request.action];
  if (!handler) {
    logger.error(`Action inconnue: ${request.action}`);
    return false;
  }

  // Gestion asynchrone
  Promise.resolve(handler(request))
    .then(sendResponse)
    .catch(err => {
      const errMsg = logger.error('Erreur handler:', err);
      sendResponse({ error: errMsg });
    });

  return true;
});

// Fonctions principales

async function startExport() {
  state.export.inProgress = true;
  state.export.error = null;
  state.search.startTime = Date.now(); // Enregistrer le moment de début
  logger.info(`Démarrage export à ${new Date(state.search.startTime).toLocaleString()}`);

  try {
    const tab = await chrome.tabs.create({ 
      url: "https://chatgpt.com/#settings/DataControls"
    });
    state.export.tabId = tab.id;

    // Attendre que la page soit chargée
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout chargement page'));
      }, 30000);

      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    // Injecter le script
    await chrome.scripting.executeScript({
      target: { tabId: state.export.tabId },
      files: ["contentScript.js"]
    });

    logger.info('Script injecté');
  } catch (err) {
    state.export.inProgress = false;
    state.export.error = err.message;
    throw err;
  }
}

function closeChatGptTab() {
  if (state.export.tabId) {
    chrome.tabs.remove(state.export.tabId);
    state.export.tabId = null;
    state.export.inProgress = false;
    logger.info('Onglet ChatGPT fermé');
  }
}

// Polling Email

function startEmailPolling(intervalSec, maxWaitMin, currentAttempt = 0, nextCheckTime = null) {
  // Ne rien faire si une recherche est déjà en cours
  if (state.search.isSearching) {
    logger.info('Recherche déjà en cours, ignoré');
    return;
  }

  logger.info(`Démarrage polling (intervalle: ${intervalSec}s, max: ${maxWaitMin}min)`);
  
  const now = Date.now();
  
  // Si nextCheckTime est fourni et est dans le futur, l'utiliser
  // Sinon, première vérification dans 30s
  const actualNextCheckTime = (nextCheckTime && nextCheckTime > now) 
    ? nextCheckTime 
    : (now + 30000);

  state.search.isSearching = true;
  state.search.currentAttempt = currentAttempt;
  state.search.intervalSec = intervalSec;
  state.search.maxAttempts = Math.floor((maxWaitMin * 60) / intervalSec);
  state.search.endTime = now + maxWaitMin * 60_000;
  state.search.nextCheckTime = actualNextCheckTime;
  state.search.lastError = null;
  state.search.checkedEmailIds.clear(); // Réinitialiser les emails vérifiés

  // Sauvegarder l'état dans le storage
  chrome.storage.local.set({
    searchState: {
      isSearching: true,
      startTime: state.search.startTime,
      intervalSec: intervalSec,
      maxWaitMin: maxWaitMin,
      currentAttempt: currentAttempt,
      nextCheckTime: actualNextCheckTime,
      maxAttempts: state.search.maxAttempts
    }
  });

  // Planifier la prochaine vérification
  const delayMs = actualNextCheckTime - now;
  scheduleNextCheck(Math.ceil(delayMs / 1000));
}

function stopEmailPolling() {
  if (state.search.isSearching) {
    logger.info('Arrêt du polling');
    state.search.isSearching = false;
    if (state.search.nextTimeoutId) {
      clearTimeout(state.search.nextTimeoutId);
      state.search.nextTimeoutId = null;
    }
    
    // Nettoyer l'état dans le storage
    chrome.storage.local.remove('searchState');
    // Réinitialiser les emails vérifiés
    state.search.checkedEmailIds.clear();
    state.search.startTime = null;
  }
}

function scheduleNextCheck(delaySec) {
  if (state.search.nextTimeoutId) {
    clearTimeout(state.search.nextTimeoutId);
  }

  logger.debug(`Prochaine vérification dans ${delaySec}s`);

  state.search.nextTimeoutId = setTimeout(async () => {
    if (!state.search.isSearching) return;

    if (Date.now() > state.search.endTime) {
      logger.info('Temps maximum écoulé');
      stopEmailPolling();
      return;
    }

    state.search.currentAttempt++;
    logger.info(`Tentative ${state.search.currentAttempt}/${state.search.maxAttempts}`);

    try {
      const link = await checkEmailNow();
      if (link) {
        logger.info('Email trouvé !');
        stopEmailPolling();
        // Notification de succès
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon128.png',
          title: 'Export ChatGPT',
          message: 'Email trouvé ! Démarrage du téléchargement...'
        });
        // Démarrer le téléchargement avec nom de fichier forcé
        chrome.downloads.download({
          url: link,
          filename: 'chatgpt_data.zip',
          saveAs: false
        });
      } else if (state.search.currentAttempt >= state.search.maxAttempts) {
        logger.info('Maximum de tentatives atteint');
        stopEmailPolling();
      } else {
        // Planifier la prochaine vérification
        state.search.nextCheckTime = Date.now() + state.search.intervalSec * 1000;
        
        // Mettre à jour le storage
        chrome.storage.local.get('searchState', (result) => {
          if (result.searchState) {
            chrome.storage.local.set({
              searchState: {
                ...result.searchState,
                currentAttempt: state.search.currentAttempt,
                nextCheckTime: state.search.nextCheckTime
              }
            });
          }
        });
        
        scheduleNextCheck(state.search.intervalSec);
      }
    } catch (err) {
      state.search.lastError = err.message;
      logger.error('Erreur vérification email:', err);
      
      if (state.search.currentAttempt >= state.search.maxAttempts) {
        stopEmailPolling();
      } else {
        // Planifier la prochaine vérification malgré l'erreur
        state.search.nextCheckTime = Date.now() + state.search.intervalSec * 1000;
        scheduleNextCheck(state.search.intervalSec);
      }
    }
  }, delaySec * 1000);
}

// Fonctions Gmail

async function checkEmailNow() {
  logger.debug('Vérification email...');
  
  if (!state.search.startTime) {
    logger.info('Pas de date de début définie, recherche impossible');
    return null;
  }

  const token = await getAuthToken();
  if (!token) {
    throw new Error('Impossible d\'obtenir le token Gmail');
  }

  // Formater la date pour Gmail (YYYY/MM/DD)
  const date = new Date(state.search.startTime);
  const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  const query = encodeURIComponent(`from:noreply@tm.openai.com after:${formattedDate}`);
  logger.info(`Recherche des emails reçus après ${date.toLocaleString()}`);
  logger.debug('Requête Gmail:', { query, date: formattedDate });

  const listResp = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  if (!listResp.ok) {
    const error = await listResp.text();
    logger.error('Erreur API Gmail:', { status: listResp.status, error });
    throw new Error(`Erreur API Gmail: ${listResp.status} - ${error}`);
  }
  
  const listData = await listResp.json();
  logger.debug('Réponse Gmail:', listData);

  if (!listData.messages?.length) {
    logger.info('Aucun email trouvé pour la période');
    return null;
  }

  logger.info(`${listData.messages.length} emails trouvés au total`);

  // Parcourir les emails du plus récent au plus ancien
  for (const message of listData.messages) {
    logger.info(`Analyse de l'email ${message.id}...`);
    
    const msgResp = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!msgResp.ok) {
      const error = await msgResp.text();
      logger.error(`Erreur récupération message ${message.id}:`, { status: msgResp.status, error });
      continue;
    }
    
    const msgData = await msgResp.json();
    
    // Logger les détails de l'email
    const headers = msgData.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value;
    const date = headers.find(h => h.name === 'Date')?.value;
    logger.info('Email trouvé:', JSON.stringify({
      id: message.id,
      subject: subject,
      date: date
    }, null, 2));

    // Logger le contenu brut pour analyse
    const part = msgData.payload?.parts?.find(p => p.mimeType === "text/html");
    if (part?.body?.data) {
      logger.info('Contenu brut encodé (base64):\n' + part.body.data);
      
      // Décodage base64url -> base64 -> binaire -> UTF-8
      const data = part.body.data.replace(/-/g, "+").replace(/_/g, "/");
      const binary = atob(data);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      const decodedContent = new TextDecoder("utf-8").decode(bytes);
      logger.info('Contenu décodé (HTML UTF-8):\n' + decodedContent);
    } else {
      logger.info('Pas de contenu HTML trouvé dans l\'email');
      logger.info('Contenu brut du message:', JSON.stringify(msgData, null, 2));
    }

    logger.info('Recherche du lien de téléchargement...');
    const link = extractDownloadLink(msgData);

    if (link) {
      logger.info(`Lien trouvé dans l'email ${message.id}:`, link);
      return link;
    } else {
      logger.info(`Aucun lien trouvé dans l'email ${message.id}, passage au suivant...`);
    }
  }

  logger.info('Aucun lien trouvé dans les emails');
  return null;
}

function extractDownloadLink(messageData) {
  const part = messageData.payload?.parts?.find(p => p.mimeType === "text/html");
  if (!part?.body?.data) {
    logger.error('Format email invalide');
    return null;
  }
  
  // Décodage base64url -> base64 -> binaire -> UTF-8
  const data = part.body.data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const decodedBody = new TextDecoder("utf-8").decode(bytes);
  logger.info('Contenu décodé complet:', decodedBody);
  
  // Rechercher le lien de téléchargement (supporte les deux domaines)
  const matches = decodedBody.match(/https:\/\/(?:chatgpt\.com|chat\.openai\.com)\/[^\s"<>]+/g) || [];
  logger.info('Liens trouvés:', matches);

  // Vérifier chaque lien
  for (const link of matches) {
    try {
      const url = new URL(link);
      logger.debug('Analyse URL:', {
        pathname: url.pathname,
        params: Object.fromEntries(url.searchParams)
      });

      if (url.pathname === '/backend-api/content' && url.searchParams.has('id')) {
        logger.info('Lien valide trouvé');
        return link;
      }
    } catch (err) {
      logger.debug('URL invalide:', err);
    }
  }
  
  return null;
}

function getAuthToken() {
  return new Promise(resolve => {
    chrome.identity.getAuthToken({ interactive: true }, token => {
      if (chrome.runtime.lastError) {
        logger.error('Erreur getAuthToken:', chrome.runtime.lastError);
        resolve(null);
      } else {
        resolve(token);
      }
    });
  });
}
