// src/pages/CheckoutPage.js
import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, message, Button } from 'antd';
import { loadStripe } from '@stripe/stripe-js';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { StarOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

const Container = styled.div`
  padding: 80px 20px;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%);
`;

const CheckoutCard = styled(Card)`
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border: none;
  background: white;
  margin-bottom: 0;
  overflow: hidden;
  width: 100%;
  max-width: 480px;
`;

const HeaderSection = styled.div`
  background: #001529;
  padding: 24px;
  color: white;
  margin: -24px -24px 24px -24px;
`;

const ProductTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
  }
`;

const PriceSection = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
`;

const MainPrice = styled.span`
  font-size: 32px;
  font-weight: bold;
`;

const PeriodText = styled.span`
  color: rgba(255, 255, 255, 0.65);
`;

const PaymentSection = styled.div`
  padding: 24px;
`;

const SubscribeButton = styled(Button)`
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
`;

const stripePromise = loadStripe('pk_test_51QgXxtEzPpVcFHjJdKqPgm9z12gc0b2p0iKUe0w2NqFsEYTNZhgraq9A9JlVCERfRuwDQMfyAVY1d2kuWlptMK8300hUyoFrLZ');

function CheckoutForm() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [currency, setCurrency] = useState('eur');
  const [amount, setAmount] = useState(0);
  const [prices, setPrices] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier si on revient d'une session de paiement réussie
    const queryParams = new URLSearchParams(location.search);
    const sessionId = queryParams.get('session_id');
    const success = queryParams.get('success');
    
    if (sessionId && success === 'true' && !processingPayment) {
      setProcessingPayment(true);
      handleSubscriptionSuccess(sessionId);
    } else if (success === 'false') {
      message.error(t('checkout.cancelled'));
      // Nettoyer l'URL
      navigate('/checkout', { replace: true });
    }
  }, [location, processingPayment, navigate, t]);

  useEffect(() => {
    // Charger les prix depuis le backend
    const fetchPrices = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/payment/prices');
        setPrices(data);
      } catch (error) {
        console.error('Erreur lors de la récupération des prix:', error);
      }
    };
    fetchPrices();
  }, []);

  useEffect(() => {
    // Détecter la devise en fonction de la langue
    const userLanguage = i18n.language;
    switch(userLanguage) {
      case 'en':
        setCurrency('usd');
        break;
      case 'fr':
        setCurrency('eur');
        break;
      default:
        setCurrency('eur');
    }
  }, [i18n.language]);

  useEffect(() => {
    // Mettre à jour le montant quand la devise change
    if (prices && currency) {
      setAmount(prices[currency]);
    }
  }, [currency, prices]);

  const handleSubscriptionSuccess = async (sessionId) => {
    console.log('Début du traitement du paiement avec sessionId:', sessionId);
    try {
      const token = localStorage.getItem('token');
      console.log('Token récupéré, appel au backend...');
      
      const response = await axios.post(
        'http://localhost:5000/api/payment/subscription-success',
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Réponse du backend:', response.data);
      
      if (response.data.success) {
        message.success(t('checkout.success'));
        // Nettoyer l'URL avant la redirection
        navigate('/home', { replace: true });
      } else {
        console.error('Réponse invalide du backend:', response.data);
        message.error(t('checkout.error'));
        // Nettoyer l'URL en cas d'erreur
        navigate('/checkout', { replace: true });
      }
    } catch (error) {
      console.error('Erreur détaillée:', error.response?.data || error.message);
      message.error(error.response?.data?.error || t('checkout.error'));
      // Nettoyer l'URL en cas d'erreur
      navigate('/checkout', { replace: true });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        'http://localhost:5000/api/payment/create-subscription',
        { currency },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (error) {
        message.error(t('checkout.error'));
      }
    } catch (err) {
      message.error(t('checkout.error'));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceData) => {
    if (!priceData || !priceData.amount || !priceData.currency) {
      console.error('Prix invalide:', priceData);
      return '';
    }
    const amount = priceData.amount / 100;
    return new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'fr-FR', {
      style: 'currency',
      currency: priceData.currency.toLowerCase()
    }).format(amount);
  };

  return (
    <div>
      <HeaderSection>
        <ProductTitle>
          <div className="icon">
            <StarOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
          </div>
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            {t('checkout.title')}
          </Title>
        </ProductTitle>
        <PriceSection>
          <MainPrice>{formatPrice(amount)}</MainPrice>
          <PeriodText>{t('checkout.period')}</PeriodText>
        </PriceSection>
        <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
          {t('checkout.billingInfo')}
        </Text>
      </HeaderSection>

      <PaymentSection>
        <Paragraph style={{ marginBottom: '24px', fontSize: '16px' }}>
          {t('checkout.subscriptionDetails')}
        </Paragraph>

        <SubscribeButton
          type="primary"
          loading={loading}
          onClick={handleSubscribe}
          disabled={!amount}
        >
          {loading ? t('checkout.processing') : t('checkout.subscribe', { price: formatPrice(amount) })}
        </SubscribeButton>
      </PaymentSection>
    </div>
  );
}

function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error(t('checkout.needLogin'));
      navigate('/login', { state: { redirectTo: '/checkout' } });
    }
  }, [navigate, t]);

  return (
    <Container>
      <CheckoutCard>
        <CheckoutForm />
      </CheckoutCard>
    </Container>
  );
}

export default CheckoutPage;
