import React, { useState, useEffect } from 'react';
import { Card, Progress, Typography, Row, Col, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import styled, { keyframes } from 'styled-components';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const TimerIcon = styled(ClockCircleOutlined)`
  margin-right: 4px;
  animation: ${rotate} 5s linear infinite;
`;

const StyledCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const QuotaCard = styled(Card)`
  background: ${props => props.$type === 'o1' ? '#f6f7ff' : '#f6ffed'};
  border: 1px solid ${props => props.$type === 'o1' ? '#d6e4ff' : '#b7eb8f'};
  margin-bottom: 16px;
`;

const Timer = ({ resetDate }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [exactTime, setExactTime] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const reset = new Date(resetDate);
      const diff = reset - now;

      if (diff <= 0) return '';

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const exact = t('quota.timer.exact', {
        days,
        hours,
        minutes,
        seconds,
        defaultValue: '{{days}}j {{hours}}h {{minutes}}m {{seconds}}s'
      });
      setExactTime(exact);

      let display = '';
      if (days > 0) {
        display = t('quota.timer.daysHours', { days, hours });
      } else if (hours > 0) {
        display = t('quota.timer.hoursMinutes', { hours, minutes });
      } else if (minutes > 0) {
        display = t('quota.timer.minutesSeconds', { minutes, seconds });
      } else {
        display = t('quota.timer.seconds', { seconds });
      }
      
      return display;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [resetDate, t]);

  if (!timeLeft) return null;

  return (
    <Tooltip title={t('quota.timer.exactTooltip', { time: exactTime })}>
      <Text style={{ marginLeft: '8px', color: '#1890ff' }}>
        (<TimerIcon />{timeLeft})
      </Text>
    </Tooltip>
  );
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const QuotaDisplay = ({ quotas }) => {
  const { t } = useTranslation();

  return (
    <StyledCard>
      <Title level={3}>{t('quota.title')}</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: '20px' }}>
        {t('quota.description')}
      </Text>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <QuotaCard $type="o1" title={t('quota.o1.title')}>
            {quotas.o1.isReset ? (
              <Text>{t('quota.resetMessage')}</Text>
            ) : (
              <>
                <Progress
                  percent={Math.round((quotas.o1.used / 50) * 100)}
                  success={{ percent: 0 }}
                  format={() => `${quotas.o1.used}/50`}
                  status={quotas.o1.remaining === 0 ? 'exception' : 'active'}
                />
                <div style={{ marginTop: '16px' }}>
                  <Text strong>{t('quota.messagesRemaining')}: </Text>
                  <Text>{quotas.o1.remaining}</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text strong>{t('quota.resetDate')}: </Text>
                  <Text>{formatDate(quotas.o1.resetDate)}</Text>
                  <Timer resetDate={quotas.o1.resetDate} />
                </div>
              </>
            )}
            <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}>
              {t('quota.o1.info')}
            </Text>
          </QuotaCard>
        </Col>

        <Col xs={24} md={12}>
          <QuotaCard $type="o1mini" title={t('quota.o1mini.title')}>
            {quotas.o1mini.isReset ? (
              <Text>{t('quota.resetMessage')}</Text>
            ) : (
              <>
                <Progress
                  percent={Math.round((quotas.o1mini.used / 50) * 100)}
                  success={{ percent: 0 }}
                  format={() => `${quotas.o1mini.used}/50`}
                  status={quotas.o1mini.remaining === 0 ? 'exception' : 'active'}
                />
                <div style={{ marginTop: '16px' }}>
                  <Text strong>{t('quota.messagesRemaining')}: </Text>
                  <Text>{quotas.o1mini.remaining}</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text strong>{t('quota.resetDate')}: </Text>
                  <Text>{formatDate(quotas.o1mini.resetDate)}</Text>
                  <Timer resetDate={quotas.o1mini.resetDate} />
                </div>
              </>
            )}
            <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '12px' }}>
              {t('quota.o1mini.info')}
            </Text>
          </QuotaCard>
        </Col>
      </Row>
    </StyledCard>
  );
};

export default QuotaDisplay; 