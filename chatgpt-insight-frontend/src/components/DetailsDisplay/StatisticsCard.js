import React from 'react';
import { Card, Row, Col, Statistic, Tooltip } from 'antd';
import { MessageOutlined, TeamOutlined, DollarOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const StyledCard = styled(Card)`
  margin: 12px auto;
  max-width: 1400px;
  background: linear-gradient(135deg, #ffffff 0%, #f0f5ff 100%);
  border: 1px solid #e6f0ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;

  .ant-card-body {
    padding: 12px 24px;
  }

  .ant-statistic-title {
    color: #666;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .ant-statistic-content {
    color: #1890ff;
    font-size: 22px;
  }

  .anticon {
    font-size: 18px;
    color: #1890ff;
    margin-right: 8px;
  }

  .stat-wrapper {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    border-radius: 6px;
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(24, 144, 255, 0.05);
    }
  }
`;

function StatisticsCard({ totalConversations, totalMessages }) {
  const { t } = useTranslation();

  // Calcul de statistiques supplémentaires
  const averageMessagesPerConv = totalConversations ? Math.round(totalMessages / totalConversations) : 0;

  return (
    <StyledCard>
      <Row gutter={[24, 12]} justify="space-around" align="middle">
        <Col xs={24} sm={8}>
          <Tooltip title={t('details.conversations.stats.totalConversations.tooltip')}>
            <div className="stat-wrapper">
              <TeamOutlined />
              <Statistic
                title={t('details.conversations.stats.totalConversations.label')}
                value={totalConversations}
                suffix={t('details.conversations.stats.totalConversations.suffix')}
              />
            </div>
          </Tooltip>
        </Col>
        <Col xs={24} sm={8}>
          <Tooltip title={t('details.conversations.stats.totalMessages.tooltip')}>
            <div className="stat-wrapper">
              <MessageOutlined />
              <Statistic
                title={t('details.conversations.stats.totalMessages.label')}
                value={totalMessages}
                suffix={t('details.conversations.stats.totalMessages.suffix')}
              />
            </div>
          </Tooltip>
        </Col>
        <Col xs={24} sm={8}>
          <Tooltip title={t('details.conversations.stats.averageMessages.tooltip')}>
            <div className="stat-wrapper">
              <DollarOutlined />
              <Statistic
                title={t('details.conversations.stats.averageMessages.label')}
                value={averageMessagesPerConv}
                suffix={t('details.conversations.stats.averageMessages.suffix')}
              />
            </div>
          </Tooltip>
        </Col>
      </Row>
    </StyledCard>
  );
}

export default StatisticsCard;
