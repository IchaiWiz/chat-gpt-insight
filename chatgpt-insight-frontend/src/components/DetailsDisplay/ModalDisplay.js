import React from 'react';
import styled from 'styled-components';
import { Modal } from 'antd';
import MessageList from './MessageList';

const ModalContainer = styled(Modal)`
  /* Styles spécifiques si nécessaire */
`;

function ModalDisplay({
  isModalVisible,
  handleModalClose,
  selectedConversation,
  searchTerm,
  searchMode,
}) {
  return (
    <ModalContainer
      title={selectedConversation ? selectedConversation.title : ''}
      visible={isModalVisible}
      onCancel={handleModalClose}
      footer={null}
      width="95%"
      style={{ top: 0 }}
      bodyStyle={{ height: '90vh', overflow: 'auto' }}
      centered
      destroyOnClose
      maskClosable
      closable
    >
      {selectedConversation && (
        <MessageList
          messages={selectedConversation.messages}
          searchTerm={searchTerm}
          searchMode={searchMode}
          isModal
        />
      )}
    </ModalContainer>
  );
}

export default ModalDisplay;
