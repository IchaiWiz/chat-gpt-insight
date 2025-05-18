import React, { useState, useEffect } from 'react';
import { Card, Form, DatePicker, Radio, Switch, Input, Button, Typography, Modal, Alert, Space, Tabs, Collapse, Spin, Row, Col, Statistic, Progress, Tooltip } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import axios from 'axios';
import moment from 'moment';

const { Title, Text } = Typography;

const StyledCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const StatContainer = styled.div`
  padding: 20px 0;
`;

const CommentText = styled(Text)`
  display: block;
  margin-top: 16px;
  font-size: 16px;
  text-align: center;
`;

const SubscriptionStats = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        
        const subscriptionResponse = await axios.get('http://localhost:5000/api/user/subscription', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const statsResponse = await axios.get('http://localhost:5000/api/user/stats/history', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (subscriptionResponse.data && statsResponse.data) {
          const subscriptionData = subscriptionResponse.data;
          const usageStats = statsResponse.data;

          // Calculer le total facturé à partir des paiements Stripe
          const stripeTotalBilled = subscriptionData.stripe_payments
            ? subscriptionData.stripe_payments
                .filter(payment => payment.status === 'paid')
                .reduce((sum, payment) => sum + payment.amount, 0)
            : 0;

          // Utiliser l'historique des factures comme fallback
          const allBillingDates = [
            { date: subscriptionData.first_billing_date, amount: 20 },
            ...(subscriptionData.billing_dates || [])
          ];

          const billingTotalBilled = allBillingDates.reduce((sum, bill) => sum + (bill.amount || 20), 0);
          
          // Utiliser le total Stripe s'il existe, sinon utiliser le total des factures
          const totalBilled = stripeTotalBilled > 0 ? stripeTotalBilled : billingTotalBilled;
          const totalMonths = stripeTotalBilled > 0 
            ? subscriptionData.stripe_payments.filter(p => p.status === 'paid').length 
            : allBillingDates.length;
          const monthlyAverage = totalBilled / totalMonths;

          const lastUsageStats = usageStats[usageStats.length - 1];
          const totalUsageCost = lastUsageStats?.total_cost || 0;

          const usageRatio = totalUsageCost / totalBilled;
          const percentile = calculatePercentile(usageRatio);

          setStats({
            totalBilled,
            monthlyAverage,
            totalUsageCost,
            usageRatio,
            percentile,
            numberOfMonths: totalMonths
          });
        }
      } catch (err) {
        console.error(t('subscriptionStats.error.fetch'), err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [t]);

  const calculatePercentile = (ratio) => {
    if (ratio > 5) return 99;
    if (ratio > 3) return 90;
    if (ratio > 2) return 75;
    if (ratio > 1) return 50;
    return 25;
  };

  const getUsageComment = (stats) => {
    if (stats.usageRatio >= 2) {
      return t('subscriptionStats.usageRatio.comments.excellent');
    } else if (stats.usageRatio >= 1) {
      return t('subscriptionStats.usageRatio.comments.good');
    } else if (stats.usageRatio >= 0.5) {
      return t('subscriptionStats.usageRatio.comments.average');
    } else {
      return t('subscriptionStats.usageRatio.comments.low');
    }
  };

  if (loading || !stats) {
    return <StyledCard loading={true}><Spin tip={t('common.loading')} /></StyledCard>;
  }

  return (
    <StyledCard>
      <Title level={3}>{t('subscriptionStats.title')}</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={8}>
          <Tooltip title={t('subscriptionStats.totalBilled.tooltip')}>
            <Statistic
              title={t('subscriptionStats.totalBilled.title')}
              value={stats.totalBilled}
              prefix="$"
              precision={2}
              suffix={t('subscriptionStats.totalBilled.suffix', { months: stats.numberOfMonths })}
            />
          </Tooltip>
        </Col>
        <Col xs={24} sm={8}>
          <Tooltip title={t('subscriptionStats.monthlyAverage.tooltip')}>
            <Statistic
              title={t('subscriptionStats.monthlyAverage.title')}
              value={stats.monthlyAverage}
              prefix="$"
              precision={2}
              suffix={t('subscriptionStats.monthlyAverage.suffix')}
            />
          </Tooltip>
        </Col>
        <Col xs={24} sm={8}>
          <Tooltip title={t('subscriptionStats.valueGenerated.tooltip')}>
            <Statistic
              title={t('subscriptionStats.valueGenerated.title')}
              value={stats.totalUsageCost}
              prefix="$"
              precision={2}
              suffix={t('subscriptionStats.valueGenerated.suffix')}
            />
          </Tooltip>
        </Col>
      </Row>

      <StatContainer>
        <Tooltip title={t('subscriptionStats.usageRatio.tooltip')}>
          <Progress
            percent={Math.min(stats.usageRatio * 20, 100)}
            status="active"
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            format={() => `${stats.usageRatio.toFixed(2)}x`}
          />
        </Tooltip>
      </StatContainer>

      <CommentText>
        <TrophyOutlined style={{ marginRight: 8, color: '#faad14' }} />
        {getUsageComment(stats)}
      </CommentText>
    </StyledCard>
  );
};

export default SubscriptionStats; 