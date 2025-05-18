import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card, Button, Typography } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import MessageCard from './MessageCard';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const StyledCard = styled(Card)`
  border-radius: 8px;
  border: 1px solid #f0f0f0;
`;

const ScrollContainer = styled.div`
  max-height: ${props => (props.isModal ? '80vh' : '400px')};
  overflow: auto;
  padding: 0 16px;
  border: none;
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
  }
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
`;

const ExpandAllButton = styled(Button)`
  margin-bottom: 16px;
`;

function MessageList({ messages, searchTerm, searchMode, isModal = false }) {
  const { t } = useTranslation();
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  const batchSize = 20;

  useEffect(() => {
    setVisibleMessages(messages.slice(0, batchSize));
    setHasMore(messages.length > batchSize);
    setExpandAll(false);
  }, [messages]);

  const fetchMoreData = () => {
    if (visibleMessages.length >= messages.length) {
      setHasMore(false);
      return;
    }
    // On pourrait charger plus de messages ici si on le souhaite
  };

  const handleExpandAll = () => {
    setExpandAll(prev => !prev);
  };

  return (
    <StyledCard bordered={false}>
      <ExpandAllButton onClick={handleExpandAll} type="primary" size="small">
        {expandAll ? t('details.messageList.collapseAll') : t('details.messageList.expandAll')}
      </ExpandAllButton>
      <ScrollContainer id="scrollableDiv" isModal={isModal}>
        <InfiniteScroll
          dataLength={visibleMessages.length}
          next={fetchMoreData}
          hasMore={hasMore}
          loader={<h4>{t('details.messageList.loading')}</h4>}
          endMessage={
            <p style={{ textAlign: 'center' }}>
              <b>{t('details.messageList.endMessage')}</b>
            </p>
          }
          scrollableTarget="scrollableDiv"
        >
          {visibleMessages.map((message, index) => (
            <MessageCard
              key={message.id || index}
              message={message}
              searchTerm={searchTerm}
              searchMode={searchMode}
              expandAll={expandAll}
            />
          ))}
        </InfiniteScroll>
      </ScrollContainer>
    </StyledCard>
  );
}

export default MessageList;
