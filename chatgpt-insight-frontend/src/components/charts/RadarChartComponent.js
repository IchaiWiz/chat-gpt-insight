// src/components/charts/RadarChartComponent.js

import React from 'react';
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip, Legend } from 'recharts';
import { Card } from 'antd';
import { useTranslation } from 'react-i18next';

const RadarChartComponent = ({ data }) => {
    const { t } = useTranslation();

    return (
        <Card style={{ borderRadius: '10px' }}>
            <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={data}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <Tooltip />
                    <Legend />
                    <Radar name={t('stats.totalCost.label')} dataKey="Coût" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Radar name={t('stats.totalInputTokens.label')} dataKey="Tokens" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                </RadarChart>
            </ResponsiveContainer>
        </Card>
    );
};

export default RadarChartComponent;
