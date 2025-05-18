import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const { Option } = Select;

const StyledSelect = styled(Select)`
  &.ant-select {
    width: 80px;
    
    .ant-select-selector {
      background-color: transparent !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      
      &:hover {
        border-color: #1890ff !important;
      }
    }
    
    .ant-select-selection-item {
      color: rgba(255, 255, 255, 0.85);
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
`;

const FlagOption = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FlagImage = styled.img`
  width: 20px;
  height: 15px;
  object-fit: cover;
  border-radius: 2px;
`;

const LanguageSelector = () => {
  const { t, i18n } = useTranslation();

  const handleChange = (value) => {
    i18n.changeLanguage(value);
  };

  return (
    <Space>
      <GlobalOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
      <StyledSelect
        defaultValue={i18n.language}
        onChange={handleChange}
        dropdownStyle={{ minWidth: '120px' }}
      >
        <Option value="fr">
          <FlagOption>
            <FlagImage
              src="https://flagcdn.com/w40/fr.png"
              alt={t('languageSelector.frenchFlag')}
            />
            <span>{t('languageSelector.french')}</span>
          </FlagOption>
        </Option>
        <Option value="en">
          <FlagOption>
            <FlagImage
              src="https://flagcdn.com/w40/gb.png"
              alt={t('languageSelector.britishFlag')}
            />
            <span>{t('languageSelector.english')}</span>
          </FlagOption>
        </Option>
      </StyledSelect>
    </Space>
  );
};

export default LanguageSelector; 