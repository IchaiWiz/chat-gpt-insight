// src/pages/LandingPage.js
import React, { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Button, Space, List, Spin } from 'antd';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  BarChartOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  DollarOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  StarOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const gradientAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const shine = keyframes`
  0% { background-position: -100% 100%; }
  100% { background-position: 100% 100%; }
`;

const invertedGradientAnimation = keyframes`
  0% { background-position: 0% 50%; border-color: #1890ff; }
  25% { border-color: #722ed1; }
  50% { background-position: 100% 50%; border-color: #13c2c2; }
  75% { border-color: #52c41a; }
  100% { background-position: 0% 50%; border-color: #1890ff; }
`;

const Container = styled.div`
  padding: 0;
  min-height: 100vh;
  background: #ffffff;
  overflow: hidden;
`;

const HeroSection = styled.div`
  background: linear-gradient(-45deg, #1890ff, #722ed1, #13c2c2, #52c41a);
  background-size: 400% 400%;
  animation: ${gradientAnimation} 15s ease infinite;
  padding: 120px 20px 160px;
  text-align: center;
  color: white;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%);
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -50px;
    left: 0;
    right: 0;
    height: 100px;
    background: #fff;
    clip-path: polygon(0 0, 100% 50%, 100% 100%, 0% 100%);
  }
`;

const StyledCard = styled(Card)`
  border-radius: 16px;
  margin-bottom: 40px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      120deg,
      transparent,
      rgba(24,144,255,0.05),
      transparent
    );
    animation: ${shine} 3s infinite;
  }

  .ant-card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    z-index: 1;
  }

  &:hover {
    transform: translateY(-5px);
    border-color: #1890ff;
    box-shadow: 0 8px 24px rgba(24,144,255,0.15);
  }
`;

const FeatureIcon = styled.div`
  font-size: 40px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  color: #1890ff;
  transition: all 0.3s ease;
  animation: ${float} 3s ease-in-out infinite;

  ${StyledCard}:hover & {
    transform: scale(1.1);
    background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
    color: white;
  }
`;

const PricingCard = styled(Card)`
  text-align: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  height: 100%;
  display: flex;
  flex-direction: column;

  .ant-card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .button-wrapper {
    margin-top: auto;
    padding-top: 20px;
  }

  .ant-list {
    flex: 1;
    margin: 20px 0;
  }

  ${props => props.$isPremium && `
    border: 2px solid #1890ff;
    background: linear-gradient(to bottom, rgba(24,144,255,0.05), rgba(255,255,255,0.95));
    
    &::before {
      content: '✨ POPULAIRE';
      position: absolute;
      top: 12px;
      right: -35px;
      transform: rotate(45deg);
      background: linear-gradient(90deg, #1890ff, #096dd9);
      color: white;
      padding: 4px 40px;
      font-size: 12px;
      font-weight: bold;
      z-index: 1;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
  `}

  .ant-list-item {
    padding: 12px 0;
    transition: all 0.3s ease;
    justify-content: center;

    &:hover {
      transform: translateX(5px);
      color: #1890ff;
    }
  }
`;

const PriceTag = styled.div`
  font-size: 48px;
  color: #1890ff;
  margin: 20px 0;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-shadow: 0 2px 4px rgba(24,144,255,0.2);
`;

const Section = styled.div`
  padding: 100px 20px;
  position: relative;
  
  ${props => props.$gray && `
    background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 100%;
      background: radial-gradient(circle at 50% 0%, rgba(24,144,255,0.05) 0%, transparent 70%);
    }
  `}
`;

const FeatureContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px;
`;

const FeatureDescription = styled(Text)`
  flex: 1;
  font-size: 16px;
  line-height: 1.6;
  margin-top: 16px;
  color: rgba(0, 0, 0, 0.65);
`;

const SectionTitle = styled(Title)`
  position: relative;
  display: inline-block;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #1890ff, #096dd9);
    border-radius: 3px;
  }
`;

const StyledButton = styled(Button)`
  height: 48px;
  font-size: 16px;
  border-radius: 24px;
  transition: all 0.3s ease;
  
  &.ant-btn-primary {
    background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%) !important;
    border: none;
    box-shadow: 0 4px 12px rgba(24,144,255,0.3);
    
    &:hover {
      opacity: 0.9;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(24,144,255,0.4);
    }
  }
  
  &.ant-btn-default {
    border: 2px solid;
    border-color: #fff;
    color: #fff;
    backdrop-filter: blur(4px);
    background: rgba(255,255,255,0.1) !important;
    position: relative;
    overflow: hidden;
    animation: ${invertedGradientAnimation} 15s ease infinite;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.15) !important;
    }

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(-45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2));
      z-index: -1;
      animation: ${gradientAnimation} 15s ease infinite reverse;
      mix-blend-mode: overlay;
    }
  }
`;

const TrialText = styled(Text)`
  display: block;
  margin-top: 16px;
  color: rgba(255,255,255,0.85);
  font-size: 14px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

function LandingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const features = [
    { icon: <DollarOutlined />, ...t('landing.features.list.0', { returnObjects: true }) },
    { icon: <BarChartOutlined />, ...t('landing.features.list.1', { returnObjects: true }) },
    { icon: <SearchOutlined />, ...t('landing.features.list.2', { returnObjects: true }) },
    { icon: <RocketOutlined />, ...t('landing.features.list.3', { returnObjects: true }) }
  ];
  const benefits = t('landing.benefits.list', { returnObjects: true });

  return (
    <Container>
      <HeroSection>
        <Row justify="center">
          <Col xs={24} md={16} lg={12}>
            <Title
              level={1}
              style={{ color: 'white', marginBottom: 20, fontSize: '48px', fontWeight: 800 }}
            >
              {t('landing.hero.title')}
            </Title>
            <Paragraph style={{ color: 'white', fontSize: '20px', marginBottom: 20, opacity: 0.9 }}>
              {t('landing.hero.subtitle')}
            </Paragraph>
            <Paragraph style={{ color: 'white', fontSize: '16px', marginBottom: 40, opacity: 0.8 }}>
              {t('landing.hero.description')}
            </Paragraph>
            <Space size="large" direction="vertical" style={{ width: '100%' }}>
              <Space size="large">
                <StyledButton
                  type="primary"
                  size="large"
                  onClick={() => navigate('/register')}
                >
                  {t('landing.cta.primary')}
                </StyledButton>
                <StyledButton
                  ghost
                  size="large"
                  onClick={() => navigate('/premium')}
                >
                  {t('landing.cta.secondary')}
                </StyledButton>
              </Space>
              <TrialText>{t('landing.cta.trial')}</TrialText>
            </Space>
          </Col>
        </Row>
      </HeroSection>

      <Section>
        <Row justify="center" style={{ marginBottom: 40 }}>
          <Col xs={24} md={16} lg={12} style={{ textAlign: 'center' }}>
            <SectionTitle level={2} style={{ fontSize: '36px', marginBottom: 20 }}>
              {t('landing.features.title')}
            </SectionTitle>
          </Col>
        </Row>
        <Row gutter={[32, 32]} justify="center">
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <StyledCard hoverable>
                <FeatureContent>
                  <FeatureIcon>{feature.icon}</FeatureIcon>
                  <Title level={4} style={{ fontSize: '20px', marginBottom: 16 }}>
                    {feature.title}
                  </Title>
                  <FeatureDescription type="secondary">
                    {feature.description}
                  </FeatureDescription>
                </FeatureContent>
              </StyledCard>
            </Col>
          ))}
        </Row>
      </Section>

      <Section $gray>
        <Row justify="center" style={{ marginBottom: 40 }}>
          <Col xs={24} md={16} lg={12} style={{ textAlign: 'center' }}>
            <SectionTitle level={2} style={{ fontSize: '36px', marginBottom: 16 }}>
              {t('landing.pricing.title')}
            </SectionTitle>
            <Paragraph type="secondary" style={{ fontSize: '18px' }}>
              {t('landing.pricing.subtitle')}
            </Paragraph>
          </Col>
        </Row>
        <Row gutter={[32, 32]} justify="center">
          <Col xs={24} sm={12} lg={8}>
            <PricingCard hoverable>
              <Title level={3}>{t('landing.pricing.free.title')}</Title>
              <Text type="secondary">{t('landing.pricing.free.description')}</Text>
              <PriceTag>0€</PriceTag>
              <List
                dataSource={t('landing.pricing.free.features', { returnObjects: true })}
                renderItem={item => (
                  <List.Item>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    {item}
                  </List.Item>
                )}
              />
              <div className="button-wrapper">
                <StyledButton
                  type="primary"
                  size="large"
                  block
                  onClick={() => navigate('/register')}
                >
                  {t('landing.cta.primary')}
                </StyledButton>
              </div>
            </PricingCard>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <PricingCard $isPremium hoverable>
              <Title level={3}>{t('landing.pricing.premium.title')}</Title>
              <Text type="secondary">{t('landing.pricing.premium.description')}</Text>
              <PriceTag>
                {loading ? (
                  <Spin size="small" />
                ) : (
                  <>
                    {prices?.[i18n.language === 'en' ? 'usd' : 'eur'] ? (
                      <>
                        {formatPrice(prices[i18n.language === 'en' ? 'usd' : 'eur'])}
                        <Text type="secondary" style={{ fontSize: '16px', marginTop: 'auto' }}>
                          {t('landing.pricing.premium.period')}
                        </Text>
                      </>
                    ) : (
                      <Spin size="small" />
                    )}
                  </>
                )}
              </PriceTag>
              <List
                dataSource={t('landing.pricing.premium.features', { returnObjects: true })}
                renderItem={item => (
                  <List.Item>
                    <CheckCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                    {item}
                  </List.Item>
                )}
              />
              <div className="button-wrapper">
                <StyledButton
                  type="primary"
                  size="large"
                  block
                  onClick={() => navigate('/premium')}
                >
                  {t('landing.cta.secondary')}
                </StyledButton>
              </div>
            </PricingCard>
          </Col>
        </Row>
      </Section>

      <Section>
        <Row justify="center" style={{ marginBottom: 40 }}>
          <Col xs={24} md={16} lg={12} style={{ textAlign: 'center' }}>
            <SectionTitle level={2} style={{ fontSize: '36px' }}>
              {t('landing.benefits.title')}
            </SectionTitle>
          </Col>
        </Row>
        <Row gutter={[32, 32]} justify="center">
          {benefits.map((benefit, index) => (
            <Col xs={24} sm={8} key={index}>
              <StyledCard hoverable>
                <FeatureContent>
                  <Title level={4} style={{ fontSize: '20px', marginBottom: 16 }}>
                    {benefit.title}
                  </Title>
                  <FeatureDescription type="secondary">
                    {benefit.description}
                  </FeatureDescription>
                </FeatureContent>
              </StyledCard>
            </Col>
          ))}
        </Row>
      </Section>
    </Container>
  );
}

export default LandingPage;
