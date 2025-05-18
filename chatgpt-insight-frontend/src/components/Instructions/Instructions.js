import React from 'react';
import { Typography, List, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { InboxOutlined, DownloadOutlined, MailOutlined, SettingOutlined, ChromeOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text } = Typography;

const ComingSoonNote = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: #f6ffed;
  border-radius: 8px;
  border: 1px solid #b7eb8f;
  display: flex;
  align-items: center;
  gap: 12px;

  .icon {
    font-size: 24px;
    color: #52c41a;
  }

  .tag {
    margin-left: 8px;
  }
`;

function Instructions() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: <SettingOutlined style={{ fontSize: '20px', color: '#1890ff' }} />,
      step: t('instructions.steps.1.title'),
      description: t('instructions.steps.1.description')
    },
    {
      icon: <DownloadOutlined style={{ fontSize: '20px', color: '#1890ff' }} />,
      step: t('instructions.steps.2.title'),
      description: t('instructions.steps.2.description')
    },
    {
      icon: <InboxOutlined style={{ fontSize: '20px', color: '#1890ff' }} />,
      step: t('instructions.steps.3.title'),
      description: t('instructions.steps.3.description')
    },
    {
      icon: <MailOutlined style={{ fontSize: '20px', color: '#1890ff' }} />,
      step: t('instructions.steps.4.title'),
      description: t('instructions.steps.4.description')
    },
    {
      icon: <DownloadOutlined style={{ fontSize: '20px', color: '#1890ff' }} />,
      step: t('instructions.steps.5.title'),
      description: t('instructions.steps.5.description')
    }
  ];

  return (
    <div style={{ marginBottom: '20px' }}>
      <Title level={4}>{t('instructions.title')}</Title>
      <List
        itemLayout="horizontal"
        dataSource={steps}
        renderItem={item => (
          <List.Item style={{ padding: '10px 0' }}>
            <List.Item.Meta
              avatar={item.icon}
              title={<Text strong>{item.step}</Text>}
              description={
                <Text type="secondary">
                  {item.description.includes('http') ? (
                    <>
                      {item.description.split(/(\bhttps?:\/\/\S+)/gi).map((part, index) => (
                        part.match(/^https?:\/\//) ? (
                          <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
                        ) : part
                      ))}
                    </>
                  ) : item.description}
                </Text>
              }
            />
          </List.Item>
        )}
      />
      <Text style={{ fontSize: '16px', display: 'block', marginTop: '20px' }}>
        {t('instructions.finalNote')}
      </Text>
      <ComingSoonNote>
        <ChromeOutlined className="icon" />
        <div>
          <Text strong>{t('instructions.chromeExtension.title')}</Text>
          <Tag color="success" className="tag">{t('instructions.chromeExtension.tag')}</Tag>
          <br />
          <Text type="secondary">
            {t('instructions.chromeExtension.description')}
          </Text>
        </div>
      </ComingSoonNote>
    </div>
  );
}

export default Instructions;
