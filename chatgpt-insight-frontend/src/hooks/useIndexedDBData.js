import { useState, useEffect } from 'react';
import { getFromIndexedDB } from '../components/ZipFileUploader/indexedDB';

const useIndexedDBData = () => {
  const [hasData, setHasData] = useState(false);

  const checkData = async () => {
    try {
      const data = await getFromIndexedDB();
      setHasData(!!data);
    } catch (error) {
      console.error('Erreur lors de la vérification des données:', error);
      setHasData(false);
    }
  };

  useEffect(() => {
    checkData();

    // Écouter les changements de stockage
    const handleStorageChange = () => {
      checkData();
    };

    window.addEventListener('indexedDB-updated', handleStorageChange);

    return () => {
      window.removeEventListener('indexedDB-updated', handleStorageChange);
    };
  }, []);

  return hasData;
};

export default useIndexedDBData; 