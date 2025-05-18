import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin, Alert, Row, Col, Progress, Statistic, Space, Tag } from 'antd';
import { TrophyOutlined, DollarOutlined, PercentageOutlined, TeamOutlined, RocketOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;

const StyledCard = styled(Card)`
  .ant-card-body {
    padding: 24px;
  }
`;

const StatCard = styled(Card)`
  text-align: center;
  background: ${props => props.background || '#fff'};
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  height: 100%;
  
  .ant-statistic-title {
    color: rgba(0, 0, 0, 0.85);
    font-weight: 500;
  }
  
  .ant-statistic-content {
    color: ${props => props.valueColor || '#1890ff'};
  }
`;

const RankBadge = styled.div`
  background: linear-gradient(135deg, #1890ff, #722ed1);
  color: white;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);

  .rank-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .rank-subtitle {
    font-size: 16px;
    opacity: 0.9;
  }
`;

const CommentBox = styled.div`
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  padding: 16px;
  border-radius: 8px;
  margin-top: 24px;

  .comment-title {
    color: #52c41a;
    font-weight: bold;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

function StatsComparison() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [rankData, setRankData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const [invoiceStatsRes, rankRes] = await Promise.all([
          axios.get('http://localhost:5000/api/invoices/stats', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:5000/api/user/stats/rank', {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);

        setStats(invoiceStatsRes.data);
        setRankData(rankRes.data);
      } catch (err) {
        console.error('Erreur StatsComparison:', err);
        setError(t('costStats.noBillingData'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t]);

  const getUsageComment = (ratio) => {
    const costRatio = parseFloat(totalOpenAICost) / parseFloat(totalInvoices);
    const usagePercentage = (costRatio * 100).toFixed(1);

    if (costRatio >= 2.5) {
      return {
        level: 'exceptional',
        color: t('costStats.comments.exceptional.color')
      };
    } else if (costRatio >= 1.5) {
      return {
        level: 'excellent',
        color: t('costStats.comments.excellent.color')
      };
    } else if (costRatio >= 1.0) {
      return {
        level: 'good',
        color: t('costStats.comments.good.color')
      };
    } else if (costRatio >= 0.5) {
      return {
        level: 'moderate',
        color: t('costStats.comments.moderate.color')
      };
    } else {
      return {
        level: 'low',
        color: t('costStats.comments.low.color')
      };
    }
  };

  if (loading) {
    return (
      <StyledCard>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      </StyledCard>
    );
  }

  if (error) {
    return (
      <StyledCard>
        <Alert message={error} type="error" showIcon />
      </StyledCard>
    );
  }

  if (!stats || !rankData) {
    return null;
  }

  const { totalInvoices, totalOpenAICost, ratio } = stats;
  const { rank, totalUsers, percentile } = rankData;
  const { level: usageLevel, color: usageColor } = getUsageComment(ratio);

  let percentileText;
  if (percentile >= 99) {
    percentileText = "Top 1%";
  } else if (percentile >= 90) {
    percentileText = "Top 10%";
  } else {
    percentileText = `Top ${100 - percentile}%`; 
  }

  return (
    <StyledCard>
      <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
        <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
        {t('costStats.title')}
      </Title>

      <RankBadge>
        <div className="rank-title">{percentileText}</div>
        <div className="rank-subtitle">
          {t('costStats.rankingText', { rank, total: totalUsers, plural: totalUsers > 1 ? 's' : '' })}
        </div>
      </RankBadge>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <StatCard>
            <Statistic
              title={t('costStats.totalBilled.title')}
              value={parseFloat(totalInvoices)}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#1890ff' }}
            />
          </StatCard>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <StatCard>
            <Statistic
              title={t('costStats.usageCost.title')}
              value={parseFloat(totalOpenAICost)}
              precision={2}
              prefix="$"
              valueStyle={{ color: '#722ed1' }}
            />
          </StatCard>
        </Col>
        <Col xs={24} md={8}>
          <StatCard background={usageColor + '15'}>
            <Statistic
              title={t('costStats.usageRatio.title')}
              value={(parseFloat(totalOpenAICost) / parseFloat(totalInvoices)) * 100}
              precision={1}
              valueStyle={{ color: usageColor }}
              suffix="%"
            />
          </StatCard>
        </Col>
      </Row>

      <CommentBox style={{ background: usageColor + '15', borderColor: usageColor }}>
        <div className="comment-title" style={{ color: usageColor }}>
          <RocketOutlined /> {t(`costStats.comments.${usageLevel}.title`)}
        </div>
        <Paragraph style={{ margin: 0 }}>
          {t(`costStats.comments.${usageLevel}.text`)}
        </Paragraph>
      </CommentBox>

      <Progress
        percent={percentile}
        status="active"
        strokeColor={{
          '0%': '#1890ff',
          '100%': '#722ed1',
        }}
        style={{ marginTop: 24 }}
      />
    </StyledCard>
  );
}

export default StatsComparison;
