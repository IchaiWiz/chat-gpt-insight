import React from 'react';
import { Card, Typography, Tabs } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import BarCostChart from './charts/BarCostChart';
import PieCostChart from './charts/PieCostChart';
import LineTokenChart from './charts/LineTokenChart';
import BubbleChartComponent from './charts/BubbleChartComponent';
import PriceComparisonChart from './charts/PriceComparisonChart';
import { formatModelName } from '../utils/formatModelName';

const { Title } = Typography;
const { TabPane } = Tabs;

// Petit composant qui gère tout le contenu des onglets
function GraphTabs({
  barData,
  pieData,
  lineData,
  bubbleChartData,
  costThreshold,
  tabVariants
}) {
  const { t } = useTranslation();
  
  return (
    <Tabs defaultActiveKey="1" style={{ marginTop: '20px' }} animated={false}>
      <TabPane tab={t('graphs.tabs.barChart')} key="1">
        <AnimatePresence mode="wait">
          <motion.div
            key="1"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5 }}
          >
            <BarCostChart data={barData} />
          </motion.div>
        </AnimatePresence>
      </TabPane>
      <TabPane tab={t('graphs.tabs.pieChart')} key="2">
        <AnimatePresence mode="wait">
          <motion.div
            key="2"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5 }}
          >
            <PieCostChart data={pieData} costThreshold={costThreshold} />
          </motion.div>
        </AnimatePresence>
      </TabPane>
      <TabPane tab={t('graphs.tabs.lineChart')} key="3">
        <AnimatePresence mode="wait">
          <motion.div
            key="3"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5 }}
          >
            <LineTokenChart data={lineData} />
          </motion.div>
        </AnimatePresence>
      </TabPane>
      <TabPane tab={t('graphs.tabs.bubbleChart')} key="4">
        <AnimatePresence mode="wait">
          <motion.div
            key="4"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5 }}
          >
            <BubbleChartComponent data={bubbleChartData} />
          </motion.div>
        </AnimatePresence>
      </TabPane>
      <TabPane tab={t('graphs.tabs.priceComparison')} key="5">
        <AnimatePresence mode="wait">
          <motion.div
            key="5"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5 }}
          >
            <PriceComparisonChart />
          </motion.div>
        </AnimatePresence>
      </TabPane>
    </Tabs>
  );
}

function GraphsDisplay({ graphsData, messageStatsOverTime }) {
  const { t } = useTranslation();

  if (!graphsData || !messageStatsOverTime) {
    console.warn('GraphsDisplay - graphsData ou messageStatsOverTime est manquant.');
    return <Title level={4}>{t('graphs.noData')}</Title>;
  }

  const { costs_by_model, models, costs, tokens } = graphsData;
  if (!costs_by_model || !models || !costs || !tokens) {
    console.warn('GraphsDisplay - données manquantes dans graphsData:', { costs_by_model, models, costs, tokens });
    return (
      <Card>
        <Typography.Text type="danger">
          {t('graphs.missingData')}
        </Typography.Text>
      </Card>
    );
  }

  // Données pour PieChart (camembert)
  const COST_THRESHOLD = 1;
  const pieData = models.map(model => {
    const displayName = formatModelName(model);
    const cost = costs_by_model[model].total_cost;
    return {
      name: displayName,
      value: cost,
      originalName: model,
      isSmall: cost < COST_THRESHOLD,
    };
  }).sort((a, b) => b.value - a.value);

  // On ajoute un label custom
  const filteredPieDataForLabels = pieData.map(entry => ({
    ...entry,
    label: entry.isSmall ? '' : `${entry.name}: $${entry.value.toFixed(2)}`,
  }));

  // Données pour BarChart
  const barData = models.map(model => ({
    model: formatModelName(model),
    cost: costs_by_model[model].total_cost,
  })).sort((a, b) => b.cost - a.cost);

  // Données pour LineChart
  const lineData = models.map(model => ({
    model: formatModelName(model),
    tokens: costs_by_model[model].input_tokens + costs_by_model[model].output_tokens,
  }));

  // Process BubbleChart data
  const bubbleChartData = processMessageStats(messageStatsOverTime);

  // Variants pour l'animation
  const tabVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <Title level={3} style={{ textAlign: 'center', marginTop: '50px' }}>
        {t('graphs.title')}
      </Title>
      <GraphTabs
        barData={barData}
        pieData={filteredPieDataForLabels}
        lineData={lineData}
        bubbleChartData={bubbleChartData}
        costThreshold={COST_THRESHOLD}
        tabVariants={tabVariants}
      />
    </motion.div>
  );
}

// Même logique d'extraction messageStatsOverTime qu'auparavant
function processMessageStats(messageStats) {
  const { hourly } = messageStats;
  const dayHourData = {};

  Object.keys(hourly).forEach(datetime => {
    const entry = hourly[datetime];
    const [datePart, timePart] = datetime.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const date = new Date(year, month - 1, day, hour, minute);

    let dayOfWeek = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    dayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

    const currentHour = date.getHours();

    if (!dayHourData[dayOfWeek]) {
      dayHourData[dayOfWeek] = {};
    }
    if (!dayHourData[dayOfWeek][currentHour]) {
      dayHourData[dayOfWeek][currentHour] = { totalMessages: 0, count: 0 };
    }

    const totalMessages = (entry.user_messages || 0) + (entry.assistant_messages || 0);
    dayHourData[dayOfWeek][currentHour].totalMessages += totalMessages;
    dayHourData[dayOfWeek][currentHour].count += 1;
  });

  const processedData = [];
  Object.keys(dayHourData).forEach(day => {
    Object.keys(dayHourData[day]).forEach(hour => {
      const data = dayHourData[day][hour];
      const averageMessages = data.totalMessages / data.count;
      processedData.push({
        day,
        hour: hour,
        averageMessages: Math.round(averageMessages),
      });
    });
  });

  return processedData;
}

export default GraphsDisplay;
