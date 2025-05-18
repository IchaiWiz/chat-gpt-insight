import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Card, Row, Col, Typography, Button } from 'antd';
import moment from 'moment';
import Highlighter from 'react-highlight-words';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const StyledCard = styled(Card)`
  margin-bottom: 10px;
  border-radius: 8px;
`;

const CostRow = styled(Row)`
  margin-top: 16px;
`;

const ModelText = styled(Text)`
  display: block;
  margin-top: 5px;
  font-size: 0.8em;
`;

const ToggleButton = styled(Button)`
  padding: 0;
  margin-top: 8px;
`;

const UserMessageContent = styled.div`
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
  font-size: 16px;
  color: #333;
  margin-top: 10px;
`;

const ImageIndicator = styled.div`
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f5f5;
  border-left: 4px solid #1890ff;
  border-radius: 4px;
  font-size: 14px;
  color: #555;
`;

function MessageCard({ message, searchTerm, searchMode, expandAll }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hasContent = (message.content && message.content.trim().length > 0)
    || (message.additional_info?.text && message.additional_info.text.trim().length > 0);
  const hasImages = (message.gen_ids && message.gen_ids.length > 0)
    || (message.role === 'user' && message.additional_info?.images?.length > 0);
  const messageText = hasContent ? (message.content || message.additional_info?.text) : '';
  const threshold = 200;
  const isLongText = messageText.length > threshold;
  const imageCount = hasImages
    ? (message.role === 'user' && message.additional_info?.images?.length > 0
      ? message.additional_info.images.length
      : (message.gen_ids?.length || 0))
    : 0;

  const formatNumber = (value, precision = 0) => {
    return value.toLocaleString('fr-FR', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    });
  };

  const formatCurrency = (value, precision = t('details.message.format.currency.decimals')) => {
    return `${t('details.message.format.currency.symbol')}${formatNumber(value, precision)}`;
  };

  useEffect(() => {
    if (hasContent || hasImages) {
      setExpanded(expandAll);
    }
  }, [expandAll, hasContent, hasImages]);

  if (!hasContent && !hasImages) {
    return null;
  }

  const getSnippet = (text, keyword, snippetLength = 200) => {
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

  const isMarkdown = message.role === 'assistant' || message.role === 'tool';
  const markdownContent = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={github}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {messageText}
    </ReactMarkdown>
  );

  const content = isMarkdown ? (
    <div>
      {expanded ? (
        <div style={{ marginTop: 10 }}>{markdownContent}</div>
      ) : (
        <div style={{ marginTop: 10 }}>{getSnippet(messageText, searchTerm)}</div>
      )}
    </div>
  ) : (
    <UserMessageContent>
      {searchTerm && searchMode === 'global' ? (
        <Highlighter
          highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
          searchWords={[searchTerm]}
          autoEscape
          textToHighlight={expanded ? messageText : getSnippet(messageText, searchTerm)}
        />
      ) : (
        <div>
          {expanded
            ? messageText.split('\n').map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  <br />
                </React.Fragment>
              ))
            : getSnippet(messageText, searchTerm)}
        </div>
      )}
    </UserMessageContent>
  );

  return (
    <StyledCard bordered={false}>
      <Row justify="space-between" align="middle">
        <Col>
          <Text strong>
            {message.role === 'user'
              ? t('details.message.roles.user')
              : message.role === 'assistant'
                ? t('details.message.roles.assistant')
                : message.role === 'tool'
                  ? t('details.message.roles.tool', { name: message.tool_name })
                  : message.role}
          </Text>
          <br />
          <Text type="secondary">
            {moment.unix(message.create_time).format(t('details.message.format.date'))}
          </Text>
        </Col>
      </Row>
      {hasContent && (
        <>
          {content}
          {isLongText && (
            <ToggleButton
              type="link"
              onClick={() => setExpanded(!expanded)}
              icon={expanded ? <UpOutlined /> : <DownOutlined />}
            >
              {expanded ? t('details.message.readLess') : t('details.message.readMore')}
            </ToggleButton>
          )}
        </>
      )}
      {imageCount > 0 && (
        <ImageIndicator>
          {t(`details.message.images.${imageCount === 1 ? 'single' : 'multiple'}`, { count: imageCount })}
        </ImageIndicator>
      )}
      {message.cost !== undefined && (
        <CostRow justify="start">
          <Text type="secondary">
            {t('details.message.cost', { amount: formatNumber(message.cost, t('details.message.format.number.precision.cost')) })}
          </Text>
        </CostRow>
      )}
      {(message.role === 'assistant' || message.role === 'tool') && message.model_slug && (
        <ModelText type="secondary">
          {t('details.message.model', { name: message.model_slug })}
        </ModelText>
      )}
    </StyledCard>
  );
}

export default MessageCard;
