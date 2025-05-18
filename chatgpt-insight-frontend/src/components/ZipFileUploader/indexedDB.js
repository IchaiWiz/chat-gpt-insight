// Initialisation de IndexedDB
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChatGPTInsightDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('analysisData')) {
        db.createObjectStore('analysisData', { keyPath: 'id' });
      }
    };
  });
};

// Sauvegarder les données dans IndexedDB
export const saveToIndexedDB = async (data) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['analysisData'], 'readwrite');
    const store = transaction.objectStore('analysisData');
    
    // On utilise toujours la même clé pour n'avoir qu'un seul jeu de données
    const request = store.put({ id: 'currentData', ...data });
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Émettre un événement pour notifier que les données ont été mises à jour
      window.dispatchEvent(new Event('indexedDB-updated'));
      resolve();
    };
  });
};

// Récupérer les données depuis IndexedDB
export const getFromIndexedDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['analysisData'], 'readonly');
    const store = transaction.objectStore('analysisData');
    const request = store.get('currentData');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// Supprimer les données d'IndexedDB
export const clearFromIndexedDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['analysisData'], 'readwrite');
    const store = transaction.objectStore('analysisData');
    const request = store.delete('currentData');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}; 