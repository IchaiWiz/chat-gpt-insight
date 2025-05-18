import React from 'react';
import styled from 'styled-components';
import { Radio, Select, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;
const { Option } = Select;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

function FilterControls({
  searchMode,
  setSearchMode,
  filterType,
  setFilterType,
  filterOrder,
  setFilterOrder,
  selectedModels,
  setSelectedModels,
  availableModels,
}) {
  const { t } = useTranslation();

  return (
    <ControlsContainer>
      <Radio.Group
        value={searchMode}
        onChange={e => setSearchMode(e.target.value)}
        style={{ marginRight: 20 }}
      >
        <Radio.Button value="title">{t('details.filters.searchModes.byTitle')}</Radio.Button>
        <Radio.Button value="global">{t('details.filters.searchModes.global')}</Radio.Button>
      </Radio.Group>

      <Text strong style={{ marginRight: 10 }}>{t('details.filters.filterBy')}</Text>
      <Select
        placeholder={t('details.filters.selectFilter')}
        style={{ width: 200, marginRight: 10 }}
        onChange={setFilterType}
        allowClear
      >
        <Option value="exchanges">{t('details.filters.types.exchanges')}</Option>
        <Option value="tokens">{t('details.filters.types.tokens')}</Option>
        <Option value="cost">{t('details.filters.types.cost')}</Option>
      </Select>
      <Select
        placeholder={t('details.filters.order.placeholder')}
        style={{ width: 120, marginRight: 10 }}
        value={filterOrder}
        onChange={setFilterOrder}
      >
        <Option value="ascend">{t('details.filters.order.ascending')}</Option>
        <Option value="descend">{t('details.filters.order.descending')}</Option>
      </Select>
      <Select
        mode="multiple"
        placeholder={t('details.filters.models.placeholder')}
        style={{ width: 300 }}
        value={selectedModels}
        onChange={setSelectedModels}
        allowClear
      >
        {availableModels.map(model => (
          <Option key={model} value={model}>{model}</Option>
        ))}
      </Select>
    </ControlsContainer>
  );
}

export default FilterControls;
