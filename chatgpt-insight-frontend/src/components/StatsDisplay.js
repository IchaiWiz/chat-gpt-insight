import React from 'react';
import { Card, Row, Col, Typography, Tooltip } from 'antd';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import {
  WechatOutlined,
  FileWordOutlined,
  FormOutlined,
  ExportOutlined,
  CalculatorOutlined,
  DollarCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const StatCard = styled(motion(Card))`
  border-radius: 10px;
  text-align: center;
  transition: box-shadow 0.3s ease, transform 0.3s ease;
  &:hover {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    transform: translateY(-5px);
  }
`;

function StatsDisplay({ stats }) {
  const { t } = useTranslation();

  if (!stats) {
    return <Title level={4}>{t('stats.notAvailable')}</Title>;
  }

  const requiredKeys = [
    'totalConversations',
    'totalWords',
    'totalInputTokens',
    'totalOutputTokens',
    'averageWordsPerConversation',
    'totalCost',
  ];

  const missingKeys = requiredKeys.filter(key => !(key in stats));
  if (missingKeys.length > 0) {
    return (
      <Card>
        <Text type="danger">
          {t('stats.missingKeys')}: {missingKeys.join(', ')}
        </Text>
      </Card>
    );
  }

  const statsList = [
    {
      label: t('stats.totalConversations.label'),
      value: stats.totalConversations,
      icon: <WechatOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
      tooltip: t('stats.totalConversations.tooltip'),
    },
    {
      label: t('stats.totalWords.label'),
      value: stats.totalWords.toLocaleString(),
      icon: <FileWordOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      tooltip: t('stats.totalWords.tooltip'),
    },
    {
      label: t('stats.totalInputTokens.label'),
      value: stats.totalInputTokens.toLocaleString(),
      icon: <FormOutlined style={{ fontSize: '48px', color: '#faad14' }} />,
      tooltip: t('stats.totalInputTokens.tooltip'),
    },
    {
      label: t('stats.totalOutputTokens.label'),
      value: stats.totalOutputTokens.toLocaleString(),
      icon: <ExportOutlined style={{ fontSize: '48px', color: '#eb2f96' }} />,
      tooltip: t('stats.totalOutputTokens.tooltip'),
    },
    {
      label: t('stats.averageWords.label'),
      value: stats.averageWordsPerConversation,
      icon: <CalculatorOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
      tooltip: t('stats.averageWords.tooltip'),
    },
    {
      label: t('stats.totalCost.label'),
      value: `$${stats.totalCost.toFixed(2)}`,
      icon: <DollarCircleOutlined style={{ fontSize: '48px', color: '#fa541c' }} />,
      tooltip: t('stats.totalCost.tooltip'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <Title level={3} style={{ textAlign: 'center', marginBottom: '30px' }}>
        {t('stats.title')}
      </Title>
      <Row gutter={[16, 16]}>
        {statsList.map((stat, idx) => (
          <Col xs={24} sm={12} md={4} key={idx}>
            <Tooltip title={stat.tooltip}>
              <StatCard>
                {stat.icon}
                <Title level={4}>{stat.value}</Title>
                <p>{stat.label}</p>
              </StatCard>
            </Tooltip>
          </Col>
        ))}
      </Row>
    </motion.div>
  );
}

export default StatsDisplay;
