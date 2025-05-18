import React, { useState } from 'react';
import { Typography, Card, Row, Col, Divider, Alert } from 'antd';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import Instructions from '../Instructions/Instructions';
import ZipFileUploader from '../ZipFileUploader/ZipFileUploader';
import PriceComparisonChart from '../charts/PriceComparisonChart';

const { Title, Text } = Typography;

const Container = styled.div`
  padding: 50px;
  min-height: 100vh;
  background: #f9f9f9;
`;

const StyledCard = styled(Card)`
  border-radius: 10px;
  margin-bottom: 40px;
  text-align: left;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  background: #ffffff;
`;

function HomePage() {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <Container>
      <Row justify="center">
        <Col xs={24} md={16} lg={12}>
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              style={{ marginBottom: '20px' }}
              onClose={() => setError(null)}
            />
          )}

          <StyledCard>
            <Title level={2} style={{ textAlign: 'center', marginBottom: '30px' }}>
              {t('homePage.welcome')}
            </Title>
            <Text style={{ fontSize: '16px', display: 'block', marginBottom: '20px' }}>
              {t('homePage.description')}
            </Text>
            <Divider />
            <Instructions />
          </StyledCard>
          
          <StyledCard>
            <Title level={3} style={{ textAlign: 'center', marginBottom: '20px' }}>
              {t('homePage.importTitle')}
            </Title>
            <Text style={{ fontSize: '16px', display: 'block', marginBottom: '20px' }}>
              {t('homePage.importDescription')}
            </Text>
            <ZipFileUploader setError={setError} setIsUploading={setIsUploading} />
          </StyledCard>

          {!isUploading && (
            <StyledCard>
              <Title level={3} style={{ textAlign: 'center', marginBottom: '20px' }}>
                {t('homePage.priceComparison')}
              </Title>
              <PriceComparisonChart />
            </StyledCard>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default HomePage;
