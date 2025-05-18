import React from 'react';
import { Layout, Row, Col, Typography, Space } from 'antd';
import { GithubOutlined, LinkedinOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { SiGitlab } from 'react-icons/si';

const { Footer } = Layout;
const { Text, Link } = Typography;

const StyledFooter = styled(Footer)`
  background-color: #001529;
  padding: 24px 50px;
  color: rgba(255, 255, 255, 0.65);
`;

const IconStyle = {
  fontSize: '20px',
  color: 'rgba(255, 255, 255, 0.65)'
};

const FooterComponent = () => {
  const { t } = useTranslation();

  return (
    <StyledFooter>
      <Row justify="space-between" align="middle">
        <Col>
          <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
            © 2024 Ichaï Wizman. {t('footer.rights')}
          </Text>
        </Col>
        <Col>
          <Space size={24}>
            <Link href="https://github.com/IchaiWiz" target="_blank" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              <GithubOutlined style={IconStyle} />
            </Link>
            <Link href="https://gitlab.com/ichaiwizm" target="_blank" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              <SiGitlab style={IconStyle} />
            </Link>
            <Link href="https://www.linkedin.com/in/ichaï-wizman-892478323" target="_blank" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              <LinkedinOutlined style={IconStyle} />
            </Link>
            <Link href="mailto:contact@ichai-wizman.com" target="_blank" style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              <MailOutlined style={IconStyle} />
            </Link>
          </Space>
        </Col>
      </Row>
    </StyledFooter>
  );
};

export default FooterComponent; 