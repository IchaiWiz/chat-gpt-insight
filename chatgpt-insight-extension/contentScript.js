// contentScript.js

(() => {
    const LOG_PREFIX = "[ChatGPT Exporter]";
    let attempts = 0;
    let confirmAttempts = 0;
    let loginCheckAttempts = 0;
    const MAX_ATTEMPTS = 10;
    const MAX_CONFIRM_ATTEMPTS = 20;
    const MAX_LOGIN_CHECK_ATTEMPTS = 60; // 1 minute max d'attente pour la connexion
    const RETRY_INTERVAL = 1000;

    console.log(`${LOG_PREFIX} Initialisation de l'export...`);

    function isLoginPage() {
        // Vérifier les éléments spécifiques à la page de connexion
        const loginButton = document.querySelector('button[data-testid="login-button"]');
        const loginForm = document.querySelector('form[data-testid="login-form"]');
        const loginHeading = Array.from(document.querySelectorAll('h1')).find(h => h.textContent.includes('Connexion'));
        
        return !!(loginButton || loginForm || loginHeading);
    }

    function waitForLogin() {
        loginCheckAttempts++;
        console.log(`${LOG_PREFIX} Vérification de la connexion #${loginCheckAttempts}/${MAX_LOGIN_CHECK_ATTEMPTS}`);

        if (isLoginPage()) {
            if (loginCheckAttempts >= MAX_LOGIN_CHECK_ATTEMPTS) {
                console.error(`${LOG_PREFIX} Échec : délai de connexion dépassé`);
                chrome.runtime.sendMessage({ 
                    action: "exportFailed", 
                    error: "Délai de connexion dépassé. Veuillez réessayer une fois connecté." 
                });
                return;
            }
            setTimeout(waitForLogin, RETRY_INTERVAL);
        } else {
            console.log(`${LOG_PREFIX} Utilisateur connecté, démarrage de l'export...`);
            setTimeout(tryExport, 2000); // Attendre 2 secondes après la connexion
        }
    }

    function findExportButton() {
        console.log(`${LOG_PREFIX} Recherche du bouton d'export...`);
        
        // Sélecteur exact pour le bouton d'export
        const exportBtn = document.querySelector('button.btn.relative.btn-secondary[data-testid="export-data-button"]');
        console.log(`${LOG_PREFIX} Bouton trouvé:`, exportBtn);
        
        if (exportBtn) {
            const textDiv = exportBtn.querySelector('.flex.items-center.justify-center');
            console.log(`${LOG_PREFIX} Div de texte trouvé:`, textDiv?.textContent);
            
            if (textDiv && textDiv.textContent.includes('Exporter')) {
                console.log(`${LOG_PREFIX} Bouton d'export validé avec le texte:`, textDiv.textContent);
                return exportBtn;
            }
        }
        return null;
    }

    function findConfirmButton() {
        console.log(`${LOG_PREFIX} Recherche du bouton de confirmation...`);
        
        // Log tous les boutons pour debug
        const allButtons = document.querySelectorAll('button');
        console.log(`${LOG_PREFIX} Tous les boutons sur la page:`, Array.from(allButtons).map(b => ({
            text: b.textContent,
            dataTestId: b.getAttribute('data-testid'),
            classes: b.className
        })));

        // Sélecteur exact pour le bouton de confirmation
        const confirmBtn = document.querySelector('button.btn.relative.btn-primary[data-testid="confirm-data-export-button"]');
        console.log(`${LOG_PREFIX} Bouton de confirmation trouvé:`, confirmBtn);

        if (confirmBtn) {
            const textDiv = confirmBtn.querySelector('.flex.items-center.justify-center');
            console.log(`${LOG_PREFIX} Div de texte de confirmation trouvé:`, textDiv?.textContent);
            
            if (textDiv && textDiv.textContent.includes('Confirmer l\'export')) {
                console.log(`${LOG_PREFIX} Bouton de confirmation validé avec le texte:`, textDiv.textContent);
                return confirmBtn;
            }
        }

        // Essayer un sélecteur alternatif
        const altConfirmBtn = document.querySelector('button[data-testid="confirm-data-export-button"]');
        if (altConfirmBtn) {
            console.log(`${LOG_PREFIX} Bouton de confirmation trouvé avec sélecteur alternatif:`, altConfirmBtn);
            return altConfirmBtn;
        }

        return null;
    }

    function checkForConfirmButton(observer) {
        confirmAttempts++;
        console.log(`${LOG_PREFIX} Tentative de trouver le bouton de confirmation #${confirmAttempts}/${MAX_CONFIRM_ATTEMPTS}`);

        const confirmBtn = findConfirmButton();
        if (confirmBtn) {
            console.log(`${LOG_PREFIX} Bouton de confirmation trouvé, tentative de clic...`);
            try {
                confirmBtn.click();
                console.log(`${LOG_PREFIX} Clic sur le bouton de confirmation réussi`);
                observer.disconnect();

                // Notification de succès et fermeture
                setTimeout(() => {
                    console.log(`${LOG_PREFIX} Export initié avec succès`);
                    chrome.runtime.sendMessage({ 
                        action: "exportSuccess",
                        message: "Export initié avec succès"
                    });
                    chrome.runtime.sendMessage({ action: "closeChatGptTab" });
                }, 1000);
            } catch (err) {
                console.error(`${LOG_PREFIX} Erreur lors du clic sur le bouton de confirmation:`, err);
            }
        } else {
            console.log(`${LOG_PREFIX} Bouton de confirmation non trouvé`);
            if (confirmAttempts >= MAX_CONFIRM_ATTEMPTS) {
                console.error(`${LOG_PREFIX} Échec : bouton de confirmation introuvable après ${MAX_CONFIRM_ATTEMPTS} tentatives`);
                observer.disconnect();
                chrome.runtime.sendMessage({ 
                    action: "exportFailed", 
                    error: "Bouton de confirmation introuvable" 
                });
                return;
            }
            // Continuer à chercher
            setTimeout(() => checkForConfirmButton(observer), RETRY_INTERVAL);
        }
    }

    function tryExport() {
        attempts++;
        console.log(`${LOG_PREFIX} Tentative d'export #${attempts}/${MAX_ATTEMPTS}`);

        const exportBtn = findExportButton();
        if (!exportBtn) {
            if (attempts >= MAX_ATTEMPTS) {
                console.error(`${LOG_PREFIX} Échec : bouton d'export introuvable après ${MAX_ATTEMPTS} tentatives`);
                chrome.runtime.sendMessage({ 
                    action: "exportFailed", 
                    error: "Bouton d'export introuvable" 
                });
                return;
            }
            setTimeout(tryExport, RETRY_INTERVAL);
            return;
        }

        console.log(`${LOG_PREFIX} Bouton d'export trouvé, tentative de clic...`);
        try {
            exportBtn.click();
            console.log(`${LOG_PREFIX} Clic sur le bouton d'export réussi`);

            // Observer pour le bouton de confirmation
            const obs = new MutationObserver(() => {
                console.log(`${LOG_PREFIX} Changement détecté dans le DOM, recherche du bouton de confirmation...`);
            });

            obs.observe(document.body, { 
                childList: true, 
                subtree: true,
                attributes: true
            });

            // Commencer à chercher le bouton de confirmation
            checkForConfirmButton(obs);

        } catch (err) {
            console.error(`${LOG_PREFIX} Erreur lors du clic sur le bouton d'export:`, err);
            chrome.runtime.sendMessage({ 
                action: "exportFailed", 
                error: "Erreur lors du clic sur le bouton d'export" 
            });
        }
    }

    // Démarrer après un court délai pour laisser la page se charger
    console.log(`${LOG_PREFIX} Démarrage dans 1 seconde...`);
    setTimeout(() => {
        if (isLoginPage()) {
            console.log(`${LOG_PREFIX} Page de connexion détectée, attente de la connexion...`);
            waitForLogin();
        } else {
            console.log(`${LOG_PREFIX} Page déjà connectée, démarrage de l'export...`);
            tryExport();
        }
    }, 1000);
})();
