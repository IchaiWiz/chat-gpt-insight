import React, { useState, useEffect } from 'react';
import { Button, Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatsDisplay from '../components/StatsDisplay';
import GraphsDisplay from '../components/GraphsDisplay';
import DetailsDisplay from '../components/DetailsDisplay/DetailsDisplay';
import { getFromIndexedDB } from '../components/ZipFileUploader/indexedDB';

const { Text } = Typography;

function AnalysisPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await getFromIndexedDB();
        if (savedData) {
          setData(savedData);
        } else {
          // Si pas de données, rediriger vers la page d'accueil
          navigate('/');
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
        setError(err.message);
      }
    };

    loadData();
  }, [navigate]);

  const handleNewUpload = () => {
    navigate('/');
  };

  if (error) {
    return (
      <Card style={{ margin: '20px' }}>
        <Text type="danger">{t('common.error')}: {error}</Text>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <StatsDisplay stats={data.stats} />
      <GraphsDisplay
        graphsData={data.graphsData}
        messageStatsOverTime={data.messageStatsOverTime}
      />
      <DetailsDisplay details={data.details} />
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <Button type="primary" onClick={handleNewUpload}>
          {t('common.upload')}
        </Button>
      </div>
    </>
  );
}

export default AnalysisPage; 