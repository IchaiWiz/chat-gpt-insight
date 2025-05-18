// src/components/charts/LineTokenChart.js

import React from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from 'recharts';
import { Card } from 'antd';
import { formatNumber } from '../../utils/numberFormatter'; // Importez la fonction de formatage

const LineTokenChart = ({ data }) => {
    return (
        <Card style={{ borderRadius: '10px' }}>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data}>
                    <XAxis dataKey="model" />
                    <YAxis tickFormatter={formatNumber} /> {/* Utilisez le formatage ici */}
                    <Tooltip formatter={formatNumber} /> {/* Formatez également les valeurs du Tooltip */}
                    <Legend />
                    <Line type="monotone" dataKey="tokens" stroke="#82ca9d" />
                </LineChart>
            </ResponsiveContainer>
        </Card>
    );
};

export default LineTokenChart;
