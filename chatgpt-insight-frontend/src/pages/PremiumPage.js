// src/pages/PremiumPage.js
import React, { useState, useEffect } from 'react';
import { Typography, Button, List, Row, Col, Card, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleOutlined,
  StarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  RocketOutlined
} from '@ant-design/icons';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

const Container = styled.div`
  padding: 60px 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%);
`;

const PremiumCard = styled(Card)`
  border-radius: 24px;
  box-shadow: 0 12px 36px rgba(24,144,255,0.15);
  border: 2px solid #1890ff;
  background: linear-gradient(135deg, rgba(24,144,255,0.05), rgba(255,255,255,0.98));
  margin-bottom: 40px;
  padding: 30px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 16px 48px rgba(24,144,255,0.2);
  }
`;

const PriceTag = styled.div`
  font-size: 56px;
  color: #1890ff;
  margin: 30px 0;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-shadow: 0 2px 4px rgba(24,144,255,0.2);
`;

const StyledButton = styled(Button)`
  height: 54px;
  font-size: 18px;
  border-radius: 27px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%) !important;
  border: none;
  box-shadow: 0 8px 16px rgba(24,144,255,0.3);
  width: 100%;
  max-width: 300px;
  margin: 20px auto;
  display: block;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(24,144,255,0.4);
  }
`;

const FeatureSection = styled.div`
  margin: 60px 0;
  padding: 40px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
`;

const BenefitCard = styled(Card)`
  border-radius: 16px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
`;

function PremiumPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem('token'));
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/payment/prices');
      setPrices(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des prix:', error);
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

  const handlePremiumAction = () => {
    if (isAuthenticated) {
      // si déjà connecté, aller direct au checkout
      navigate('/checkout');
    } else {
      // sinon, aller s'inscrire en gardant en mémoire qu'on veut ensuite payer
      navigate('/register', { state: { redirectTo: '/checkout' } });
    }
  };

  return (
    <Container>
      <Row justify="center">
        <Col xs={24} md={20} lg={16}>
          <Title level={1} style={{ textAlign: 'center', marginBottom: 20 }}>
            <StarOutlined style={{ color: '#1890ff', marginRight: 12 }} />
            {t('premium.mainTitle')}
          </Title>
          <Paragraph style={{ textAlign: 'center', fontSize: '18px', marginBottom: 40 }}>
            {t('premium.subtitle')}
          </Paragraph>
          <PremiumCard>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 30 }}>
              {t('landing.pricing.premium.title')}
            </Title>
            <PriceTag>
              {loading ? (
                <Spin size="small" />
              ) : (
                <>
                  {prices?.[i18n.language === 'en' ? 'usd' : 'eur'] ? (
                    formatPrice(prices[i18n.language === 'en' ? 'usd' : 'eur'])
                  ) : (
                    <Spin size="small" />
                  )}
                  <Text type="secondary" style={{ fontSize: '20px', marginLeft: '8px' }}>
                    {t('landing.pricing.premium.period')}
                  </Text>
                </>
              )}
            </PriceTag>
            <List
              size="large"
              dataSource={t('premium.features.list', { returnObjects: true })}
              renderItem={item => (
                <List.Item>
                  <CheckCircleOutlined
                    style={{ color: '#1890ff', marginRight: 12, fontSize: '18px' }}
                  />
                  <Text style={{ fontSize: '16px' }}>{item}</Text>
                </List.Item>
              )}
            />
            <StyledButton type="primary" size="large" onClick={handlePremiumAction}>
              {isAuthenticated
                ? t('premium.checkout')
                : t('premium.registerAndCheckout')}
            </StyledButton>
          </PremiumCard>
          <FeatureSection>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
              {t('premium.benefits.title')}
            </Title>
            <Row gutter={[24, 24]}>
              {t('premium.benefits.list', { returnObjects: true }).map((benefit, index) => (
                <Col xs={24} md={8} key={index}>
                  <BenefitCard>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      {index === 0 && (
                        <ClockCircleOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
                      )}
                      {index === 1 && (
                        <DollarOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
                      )}
                      {index === 2 && (
                        <RocketOutlined style={{ fontSize: '36px', color: '#1890ff' }} />
                      )}
                    </div>
                    <Title level={4} style={{ textAlign: 'center' }}>
                      {benefit.title}
                    </Title>
                    <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                      {benefit.description}
                    </Paragraph>
                  </BenefitCard>
                </Col>
              ))}
            </Row>
          </FeatureSection>
        </Col>
      </Row>
    </Container>
  );
}

export default PremiumPage;
