// PriceComparisonChart.jsx
import React, { useState, useEffect } from 'react';
import { Select, Card, Space, Typography, Empty } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

const PriceComparisonChart = () => {
  const { t } = useTranslation();
  const [priceData, setPriceData] = useState(null);
  const [selectedModels, setSelectedModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/upload/prices');
        const data = await response.json();
        setPriceData(data.models || {});
      } catch (error) {
        console.error(t('graphs.priceComparison.error.fetchPrices'), error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [t]);

  const formatPrice = (value) => {
    if (typeof value !== 'number') return '$0';
    return `$${value.toFixed(value % 1 === 0 ? 0 : 1)}`;
  };

  const prepareChartData = () => {
    if (!priceData || selectedModels.length === 0) return [];

    return selectedModels.map(model => {
      const modelData = priceData[model] || { input: 0, output: 0 };
      return {
        name: model,
        [t('graphs.priceComparison.prices.input')]: Number(modelData.input) || 0,
        [t('graphs.priceComparison.prices.output')]: Number(modelData.output) || 0,
      };
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div style={{
        backgroundColor: 'white',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px'
      }}>
        <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: '3px 0', color: entry.color }}>
            {entry.name}: {formatPrice(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Title level={3}>{t('graphs.priceComparison.title')}</Title>
      
      <Select
        mode="multiple"
        style={{ width: '100%' }}
        placeholder={t('graphs.priceComparison.selectModels')}
        onChange={setSelectedModels}
        value={selectedModels}
        options={Object.keys(priceData || {})
          .filter(model => !model.toLowerCase().includes('audio'))
          .map(model => ({
            label: model,
            value: model,
          }))}
        loading={loading}
        maxTagCount={5}
        size="large"
      />

      <Card loading={loading}>
        {selectedModels.length > 0 ? (
          <div style={{ width: '100%', height: 500 }}>
            <ResponsiveContainer>
              <BarChart
                data={prepareChartData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  label={{
                    value: t('graphs.priceComparison.axis.models'),
                    position: 'bottom',
                    offset: -40,
                    style: { 
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }
                  }}
                />
                <YAxis
                  tickFormatter={formatPrice}
                  label={{
                    value: t('graphs.priceComparison.axis.pricePerMillion'),
                    angle: -90,
                    position: 'insideLeft',
                    style: { 
                      textAnchor: 'middle',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{
                    paddingTop: "20px"
                  }}
                  verticalAlign="top"
                />
                <Bar
                  dataKey={t('graphs.priceComparison.prices.input')}
                  fill="#1890ff"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey={t('graphs.priceComparison.prices.output')}
                  fill="#52c41a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty
            description={t('graphs.priceComparison.noModelSelected')}
            style={{ padding: '40px' }}
          />
        )}
      </Card>
    </Space>
  );
};

export default PriceComparisonChart;
