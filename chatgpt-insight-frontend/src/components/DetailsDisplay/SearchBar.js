import React from 'react';
import styled from 'styled-components';
import { Input, Spin } from 'antd';
import { useTranslation } from 'react-i18next';

const { Search } = Input;

const SearchBarContainer = styled.div`
  display: flex;
  justify-content: center;
`;

function SearchBar({ searchTerm, setSearchTerm, isLoading }) {
  const { t } = useTranslation();

  const handleChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <SearchBarContainer>
      <Search
        placeholder={t('search.placeholder')}
        value={searchTerm}
        onChange={handleChange}
        enterButton
        allowClear
        style={{ width: 400 }}
        suffix={isLoading ? <Spin size="small" /> : null}
      />
    </SearchBarContainer>
  );
}

export default SearchBar;
