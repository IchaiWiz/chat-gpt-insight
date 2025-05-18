import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card } from 'antd';
import { scaleLinear } from 'd3-scale';
import { useTranslation } from 'react-i18next';

const BubbleChartComponent = ({ data }) => {
    const { t } = useTranslation();

    const daysOfWeek = [
        t('graphs.bubbleChart.days.monday'),
        t('graphs.bubbleChart.days.tuesday'),
        t('graphs.bubbleChart.days.wednesday'),
        t('graphs.bubbleChart.days.thursday'),
        t('graphs.bubbleChart.days.friday'),
        t('graphs.bubbleChart.days.saturday'),
        t('graphs.bubbleChart.days.sunday')
    ];

    const dayColors = [
        '#FF6B6B', // Rouge pour Lundi
        '#4ECDC4', // Turquoise pour Mardi
        '#45B7D1', // Bleu clair pour Mercredi
        '#96CEB4', // Vert pour Jeudi
        '#FFEEAD', // Jaune pour Vendredi
        '#D4A5A5', // Rose pour Samedi
        '#9B59B6'  // Violet pour Dimanche
    ];

    function normalizeValue(value, min, max) {
        if (max === min) return 0.5;
        return (value - min) / (max - min);
    }

    function getOpacity(normalizedValue) {
        const opacityScale = scaleLinear()
            .domain([0, 0.3, 0.7, 1])
            .range([0.6, 0.75, 0.9, 1])
            .clamp(true);
        return opacityScale(normalizedValue);
    }

    function getBubbleSize(normalizedValue) {
        const sizeScale = scaleLinear()
            .domain([0, 0.3, 0.7, 1])
            .range([150, 200, 250, 300])
            .clamp(true);
        return sizeScale(normalizedValue);
    }

    function hexToRgba(hex, opacity) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    const messageValues = data.map(item => item.averageMessages);
    const minMessages = Math.min(...messageValues);
    const maxMessages = Math.max(...messageValues);

    const transformedData = daysOfWeek.map((day, index) => {
        const dayData = data.filter(item => item.day === day);
        const dayPoints = dayData.map(item => {
            const normalizedValue = normalizeValue(item.averageMessages, minMessages, maxMessages);
            const opacity = getOpacity(normalizedValue);
            const size = getBubbleSize(normalizedValue);
            const color = hexToRgba(dayColors[index], opacity);
            
            return {
                x: Number(item.hour),
                y: index,
                z: size,
                messages: item.averageMessages,
                fill: color
            };
        });
        return {
            day,
            data: dayPoints,
        };
    });

    return (
        <Card style={{ borderRadius: '10px' }}>
            <ResponsiveContainer width="100%" height={600}>
                <ScatterChart
                    margin={{
                        top: 20,
                        right: 20,
                        bottom: 40,
                        left: 80,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        type="number"
                        dataKey="x"
                        domain={[0, 23]}
                        ticks={[...Array(24).keys()]}
                        tickFormatter={(tick) => `${tick.toString().padStart(2, '0')}h`}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        domain={[0, 6]}
                        ticks={[0, 1, 2, 3, 4, 5, 6]}
                        tickFormatter={(tick) => daysOfWeek[tick]}
                    />
                    <ZAxis
                        type="number"
                        dataKey="z"
                        range={[150, 300]}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const dataPoint = payload[0].payload;
                                return (
                                    <div
                                        style={{
                                            backgroundColor: '#fff',
                                            border: '1px solid #999',
                                            padding: '10px',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        <p>{t('graphs.bubbleChart.tooltip.hour')}: {dataPoint.x}h</p>
                                        <p>{t('graphs.bubbleChart.tooltip.messages')}: {Math.round(dataPoint.messages)}</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    {transformedData.map((entry, index) => (
                        <Scatter
                            key={`scatter-${index}`}
                            data={entry.data}
                            fill={dayColors[index]}
                        />
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
        </Card>
    );
};

export default BubbleChartComponent;
