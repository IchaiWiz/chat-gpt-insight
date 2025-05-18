// src/components/DetailsDisplay/DetailsDisplay.js

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Typography, Pagination, Collapse, Space, List, Tooltip } from 'antd';
import Highlighter from 'react-highlight-words';
import { EyeOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import moment from 'moment';
import StatisticsCard from './StatisticsCard';
import SearchBar from './SearchBar';
import FilterControls from './FilterControls';
import ModalDisplay from './ModalDisplay';
import MessageList from './MessageList';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;
const { Panel } = Collapse;

// Styles pour les suggestions
const SuggestionsContainer = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #f1f1f1;
  border-top: none;
  z-index: 1000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

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

const SearchWrapper = styled.div`
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
`;

const ModelTag = styled.span`
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 4px 8px;
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
`;

function DetailsDisplay({ details }) {
  const [searchText, setSearchText] = useState('');
  const [searchMode, setSearchMode] = useState('title');
  const [filterType, setFilterType] = useState(null);
  const [filterOrder, setFilterOrder] = useState('descend');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const pageSize = 5; // Nombre d'éléments par page

  // Extraire tous les modèles uniques des conversations
  const availableModels = useMemo(() => {
    const modelSet = new Set();
    details.forEach(conversation => {
      if (conversation.dominant_model) {
        modelSet.add(conversation.dominant_model);
      }
    });
    return Array.from(modelSet);
  }, [details]);

  const filteredDetails = useMemo(() => {
    let filtered = [...details];
    
    // Calculer le coût total pour chaque conversation
    filtered = filtered.map(conversation => {
      const totalCost = conversation.messages?.reduce((sum, msg) => sum + (msg.cost || 0), 0) || 0;
      return {
        ...conversation,
        calculatedTotalCost: totalCost
      };
    });

    // Filtre par texte de recherche
    if (searchText) {
      filtered = filtered.filter(conversation => {
        if (searchMode === 'title') {
          return conversation.title.toLowerCase().includes(searchText.toLowerCase());
        } else {
          return (
            conversation.title.toLowerCase().includes(searchText.toLowerCase()) ||
            conversation.messages.some(msg => {
              const messageText = msg.content || msg.additional_info?.text;
              return messageText?.toLowerCase().includes(searchText.toLowerCase());
            })
          );
        }
      });
    }

    // Filtre par modèles sélectionnés
    if (selectedModels.length > 0) {
      filtered = filtered.filter(conversation => {
        return conversation.dominant_model && 
          selectedModels.includes(conversation.dominant_model);
      });
    }

    // Filtre par type et ordre
    if (filterType) {
      filtered.sort((a, b) => {
        let valueA, valueB;
        switch (filterType) {
          case 'exchanges':
            valueA = a.messages.length;
            valueB = b.messages.length;
            break;
          case 'tokens':
            valueA = a.messages?.reduce((sum, msg) => sum + (msg.additional_info?.token_count || 0), 0) || 0;
            valueB = b.messages?.reduce((sum, msg) => sum + (msg.additional_info?.token_count || 0), 0) || 0;
            break;
          case 'cost':
            valueA = a.calculatedTotalCost;
            valueB = b.calculatedTotalCost;
            break;
          default:
            return 0;
        }
        return filterOrder === 'ascend' ? valueA - valueB : valueB - valueA;
      });
    }

    return filtered;
  }, [details, searchText, searchMode, filterType, filterOrder, selectedModels]);

  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const isValidDetails = Array.isArray(filteredDetails);
  const totalConversations = isValidDetails ? filteredDetails.length : 0;
  const totalMessages = useMemo(() => {
    if (!isValidDetails) return 0;
    return filteredDetails.reduce((sum, conv) => sum + conv.messages.length, 0);
  }, [filteredDetails, isValidDetails]);

  const paginatedConversations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDetails.slice(start, start + pageSize);
  }, [filteredDetails, currentPage, pageSize]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const debounceTimeout = useRef(null);
  const handleSearchChange = (value) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      if (value.trim().length > 0) {
        if (searchMode === 'title') {
          const matches = details
            .filter(conversation =>
              conversation.title.toLowerCase().includes(value.toLowerCase())
            )
            .slice(0, 10);
          setSuggestions(matches);
        } else if (searchMode === 'global') {
          setIsLoading(true);
          const matches = details
            .map(conversation => {
              const matchingMessages = conversation.messages
                .filter(msg => {
                  const messageText = msg.content || msg.additional_info?.text;
                  return messageText?.toLowerCase().includes(value.toLowerCase());
                })
                .map(msg => ({
                  ...msg,
                  searchableText: msg.content || msg.additional_info?.text || ''
                }));
              
              if (matchingMessages.length > 0) {
                return {
                  ...conversation,
                  matchingMessages: matchingMessages.slice(0, 3)
                };
              }
              return null;
            })
            .filter(Boolean)
            .slice(0, 5);
          setSuggestions(matches);
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);
  };

  useEffect(() => {
    if (searchText.trim().length > 0) {
      handleSearchChange(searchText);
    } else {
      setSuggestions([]);
    }
  }, [searchMode, searchText]);

  const showModal = (conversation) => {
    setSelectedConversation(conversation);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedConversation(null);
  };

  const handleSuggestionClick = (conversation) => {
    showModal(conversation);
  };

  const getSnippet = (text, keyword, snippetLength = 100) => {
    if (!keyword) {
      return text.substr(0, snippetLength) + (text.length > snippetLength ? '...' : '');
    }
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) {
      return text.substr(0, snippetLength) + (text.length > snippetLength ? '...' : '');
    }
    const start = Math.max(0, index - snippetLength / 2);
    const end = Math.min(text.length, index + keyword.length + snippetLength / 2);
    return (start > 0 ? '... ' : '') + text.substring(start, end) + (end < text.length ? ' ...' : '');
  };

  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <Title level={3} style={{ textAlign: 'center', marginTop: '50px' }}>
        {t('details.title')}
      </Title>

      <StatisticsCard
        totalConversations={totalConversations}
        totalMessages={totalMessages}
      />

      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <SearchWrapper>
            <SearchBar
              searchTerm={searchText}
              setSearchTerm={setSearchText}
              isLoading={isLoading}
            />
            {suggestions.length > 0 && (
              <SuggestionsContainer>
                <List
                  bordered
                  dataSource={suggestions}
                  renderItem={item => (
                    <List.Item
                      style={{ cursor: 'pointer', padding: '12px' }}
                      onClick={() => handleSuggestionClick(item)}
                    >
                      <div style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '16px', marginBottom: '8px', display: 'block' }}>
                          {item.title}
                        </Text>
                        {searchMode === 'global' && item.matchingMessages && (
                          <div style={{ marginTop: '8px' }}>
                            {item.matchingMessages.map((msg, idx) => (
                              <div key={idx} style={{ marginBottom: '4px', fontSize: '14px' }}>
                                <Highlighter
                                  highlightStyle={{ backgroundColor: '#ffc069', padding: '2px' }}
                                  searchWords={[searchText]}
                                  autoEscape
                                  textToHighlight={getSnippet(msg.searchableText, searchText, 150)}
                                />
                              </div>
                            ))}
                            {item.matchingMessages.length > 3 && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {t('search.moreResults', { count: item.matchingMessages.length - 3 })}
                              </Text>
                            )}
                          </div>
                        )}
                        <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>
                          {moment.unix(item.create_time).format(t('details.format.date'))}
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
              </SuggestionsContainer>
            )}
          </SearchWrapper>

          <FilterControls
            searchMode={searchMode}
            setSearchMode={setSearchMode}
            filterType={filterType}
            setFilterType={setFilterType}
            filterOrder={filterOrder}
            setFilterOrder={setFilterOrder}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
            availableModels={availableModels}
          />
        </Space>
      </div>

      {isValidDetails ? (
        <>
          <Collapse accordion>
            {paginatedConversations.map(conversation => (
              <Panel
                key={conversation.id}
                style={{ position: 'relative' }}
                header={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div>
                      <Text strong>{conversation.title}</Text>
                      <br />
                      <Text type="secondary">
                        {moment.unix(conversation.create_time).format(t('details.format.date'))}
                      </Text>
                      <br />
                      <Text type="secondary">
                        {t('details.conversations.exchangeCount', { count: conversation.messages.length })}
                      </Text>
                      <br />
                      <Text type="secondary">
                        {t('details.conversations.totalCost', { amount: (conversation.totalCost ?? 0).toFixed(6) })}
                      </Text>
                      <br />
                      {conversation.dominant_model && (
                        <Tooltip title={t('details.conversations.dominantModel.tooltip')}>
                          <ModelTag>
                            <span role="img" aria-label="AI">{t('details.conversations.dominantModel.icon')}</span>
                            {conversation.dominant_model}
                          </ModelTag>
                        </Tooltip>
                      )}
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <EyeOutlined
                        style={{ fontSize: '18px', color: '#1890ff', cursor: 'pointer' }}
                        onClick={() => showModal(conversation)}
                      />
                    </div>
                  </div>
                }
              >
                <MessageList
                  messages={conversation.messages}
                  searchTerm={searchText}
                  searchMode={searchMode}
                  isModal={false}
                />
              </Panel>
            ))}
          </Collapse>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: 20 }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredDetails.length}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {t('details.pagination.total', { count: filteredDetails.length })}
            </Text>
          </div>
        </>
      ) : (
        <Title level={4} style={{ textAlign: 'center', marginTop: '20px' }}>
          {t('details.conversations.notAvailable')}
        </Title>
      )}

      <ModalDisplay
        isModalVisible={isModalVisible}
        handleModalClose={handleModalClose}
        selectedConversation={selectedConversation}
        searchTerm={searchText}
        searchMode={searchMode}
      />
    </motion.div>
  );
}

export default DetailsDisplay;
