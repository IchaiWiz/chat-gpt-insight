import React, { useState, useEffect, useRef } from 'react';
import { Typography, Spin, Card } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { getFromIndexedDB } from '../components/ZipFileUploader/indexedDB';
import { calculateQuotas } from '../utils/quotaCalculator';
import QuotaDisplay from '../components/QuotaDisplay/QuotaDisplay';
import StatsEvolution from '../components/StatsEvolution/StatsEvolution';
import InvoiceManager from '../components/InvoiceManager/InvoiceManager';
// ==> NOUVEAU COMPOSANT
import StatsComparison from '../components/StatsComparison/StatsComparison';
import axios from 'axios'; // Pour vérifier s'il y a déjà des factures

const { Title } = Typography;

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Section = styled(Card)`
  margin-bottom: 32px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

function PersonalSpace() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quotas, setQuotas] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const timeoutRef = useRef(null);

  // Pour savoir si l'utilisateur a déjà des factures
  const [hasInvoices, setHasInvoices] = useState(false);

  const loadData = async () => {
    try {
      // 1) Charger les quotas depuis l'IndexedDB (ton ancienne logique)
      const savedData = await getFromIndexedDB();
      if (savedData && savedData.details) {
        const calculatedQuotas = calculateQuotas(savedData.details);
        setQuotas(calculatedQuotas);
      } else {
        setError(t('personalSpace.error.noData'));
      }

      // 2) Vérifier si l'utilisateur a des factures en base
      const token = localStorage.getItem('token');
      const invoiceRes = await axios.get('http://localhost:5000/api/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (invoiceRes.data && invoiceRes.data.length > 0) {
        setHasInvoices(true);
      } else {
        setHasInvoices(false);
      }
    } catch (err) {
      console.error(err);
      setError(t('personalSpace.error.loading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [refresh]);

  if (loading) {
    return (
      <LoadingContainer>
        <Spin size="large" tip={t('common.loading')} />
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography.Text type="danger">{error}</Typography.Text>
      </Container>
    );
  }

  const handleInvoicesUpdated = () => {
    setRefresh(!refresh); // Forcer le reload
  };

  return (
    <Container>
      <Title level={2}>{t('personalSpace.title')}</Title>

      <Section>
        <Title level={4} style={{ marginTop: 0 }}>
          {t('invoiceManager.title', 'Gestion des factures')}
        </Title>
        {/* 
          On invoque InvoiceManager.
          Lorsqu'il ajoute de nouvelles factures,
          on rafraîchit la page => on saura si hasInvoices=true.
        */}
        <InvoiceManager onInvoicesAdded={handleInvoicesUpdated} />
      </Section>

      {/* 
         S'il y a déjà des factures, on affiche le composant de comparaison.
         C'est exactement ce que tu demandais : 
         "Je veux un composant qui se compare, 
          et qui s'affiche juste en dessous du composant InvoiceManager 
          si l'utilisateur a déjà mis des factures."
      */}
      {hasInvoices && (
        <Section>
          <StatsComparison />
        </Section>
      )}

      {quotas && (
        <Section>
          <Title level={4} style={{ marginTop: 0 }}>Quotas d'utilisation</Title>
          <QuotaDisplay quotas={quotas} />
        </Section>
      )}

      <Section>
        <Title level={4} style={{ marginTop: 0 }}>Évolution des statistiques</Title>
        <StatsEvolution />
      </Section>
    </Container>
  );
}

export default PersonalSpace;
