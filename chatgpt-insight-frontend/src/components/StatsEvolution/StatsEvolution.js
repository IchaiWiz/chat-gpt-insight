import React, { useState, useEffect } from 'react';
import { Card, Typography, Tabs, Spin, Empty } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styled from 'styled-components';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const StyledCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Fonction pour calculer les limites du domaine Y
const calculateYDomain = (data, key, dataPoints) => {
  if (!data || data.length === 0) return [0, 0];

  const values = data.map(item => parseFloat(item[key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Si on n'a que 2 points de données, on augmente l'amplitude
  if (dataPoints === 2) {
    const diff = max - min;
    const padding = diff * 0.5; // 50% de padding
    return [
      Math.max(0, min - padding),
      max + padding
    ];
  }

  // Pour plus de points, on ajuste en fonction de l'amplitude
  const diff = max - min;
  const padding = diff * 0.1; // 10% de padding
  return [
    Math.max(0, min - padding),
    max + padding
  ];
};

const StatsEvolution = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsHistory, setStatsHistory] = useState([]);

  useEffect(() => {
    const fetchStatsHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/user/stats/history', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Formater les données pour les graphiques
        const formattedData = response.data.map(stat => ({
          ...stat,
          date: formatDate(stat.analysis_date),
          total_cost: parseFloat(stat.total_cost),
          total_conversations: parseInt(stat.total_conversations),
          total_messages: parseInt(stat.total_messages),
          total_words: parseInt(stat.total_words),
          total_input_tokens: parseInt(stat.total_input_tokens),
          total_output_tokens: parseInt(stat.total_output_tokens),
          average_words_per_conversation: parseFloat(stat.average_words_per_conversation)
        }));
        
        setStatsHistory(formattedData);
      } catch (err) {
        console.error('Erreur lors de la récupération de l\'historique:', err);
        setError(t('statsEvolution.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchStatsHistory();
  }, [t]);

  if (loading) {
    return (
      <LoadingContainer>
        <Spin size="large" />
      </LoadingContainer>
    );
  }

  if (error) {
    return <Text type="danger">{error}</Text>;
  }

  if (statsHistory.length < 2) {
    return (
      <StyledCard>
        <Empty
          description={
            <span>
              {statsHistory.length === 0
                ? t('statsEvolution.noData')
                : t('statsEvolution.notEnoughData')}
            </span>
          }
        />
      </StyledCard>
    );
  }

  const renderLineChart = (dataKey, title, color) => {
    const domain = calculateYDomain(statsHistory, dataKey, statsHistory.length);
    
    return (
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart
            data={statsHistory}
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={domain}
              tickFormatter={value => {
                if (dataKey === 'total_cost') {
                  return `$${parseFloat(value).toFixed(2)}`;
                }
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                }
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}k`;
                }
                return value.toFixed(dataKey === 'average_words_per_conversation' ? 1 : 0);
              }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (dataKey === 'total_cost') {
                  return [`$${parseFloat(value).toFixed(2)}`, name];
                }
                if (dataKey === 'average_words_per_conversation') {
                  return [parseFloat(value).toFixed(1), name];
                }
                return [parseInt(value).toLocaleString(), name];
              }}
              labelFormatter={(label) => `${t('statsEvolution.tooltip.date')}: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={title}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <StyledCard>
      <Title level={3}>{t('statsEvolution.title')}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
        {t('statsEvolution.description')}
      </Text>

      <Tabs defaultActiveKey="1">
        <TabPane tab={t('statsEvolution.tabs.conversations')} key="1">
          {renderLineChart('total_conversations', t('statsEvolution.metrics.conversations'), '#1890ff')}
        </TabPane>
        <TabPane tab={t('statsEvolution.tabs.messages')} key="2">
          {renderLineChart('total_messages', t('statsEvolution.metrics.messages'), '#52c41a')}
        </TabPane>
        <TabPane tab={t('statsEvolution.tabs.tokens')} key="3">
          {renderLineChart('total_input_tokens', t('statsEvolution.metrics.inputTokens'), '#722ed1')}
          {renderLineChart('total_output_tokens', t('statsEvolution.metrics.outputTokens'), '#eb2f96')}
        </TabPane>
        <TabPane tab={t('statsEvolution.tabs.words')} key="4">
          {renderLineChart('total_words', t('statsEvolution.metrics.words'), '#fa8c16')}
          {renderLineChart('average_words_per_conversation', t('statsEvolution.metrics.averageWords'), '#13c2c2')}
        </TabPane>
        <TabPane tab={t('statsEvolution.tabs.cost')} key="5">
          {renderLineChart('total_cost', t('statsEvolution.metrics.totalCost'), '#f5222d')}
        </TabPane>
      </Tabs>
    </StyledCard>
  );
};

export default StatsEvolution; 