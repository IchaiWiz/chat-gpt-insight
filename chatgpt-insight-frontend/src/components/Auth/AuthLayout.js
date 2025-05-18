// src/components/Auth/AuthLayout.js
import React from 'react';
import { Typography, Card } from 'antd';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const { Title, Text } = Typography;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%);
  padding: 20px;
`;

const StyledCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
`;

const AuthLayout = ({ children, title, subtitle, linkText, linkTo }) => {
  return (
    <Container>
      <StyledCard>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
          {title}
        </Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }}>
          {subtitle}
        </Text>
        {children}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          {typeof linkTo === 'string' ? (
            <Link to={linkTo}>{linkText}</Link>
          ) : (
            <Link to={linkTo.pathname} state={linkTo.state}>{linkText}</Link>
          )}
        </div>
      </StyledCard>
    </Container>
  );
};

export default AuthLayout;
