// src/components/charts/PieCostChart.js 

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card } from 'antd';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#87ceeb', '#8a2be2'];

const PieCostChart = ({ data, costThreshold }) => {
    // Filtrer les données pour n'inclure que les entrées avec valeur >= costThreshold
    const filteredData = data.filter(entry => entry.value >= costThreshold);

    return (
        <Card style={{ borderRadius: '10px' }}>
            <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                    <Pie
                        data={filteredData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={150}
                        fill="#8884d8"
                        label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                        labelLine={false}
                    >
                        {filteredData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    {/* Utilisez les props pour centrer la légende sous le graphique */}
                    <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                    />
                </PieChart>
            </ResponsiveContainer>
        </Card>
    );
};

export default PieCostChart;
