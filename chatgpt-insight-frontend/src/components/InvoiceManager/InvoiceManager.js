import React, { useState, useEffect } from 'react';
import {
  Form,
  DatePicker,
  InputNumber,
  Button,
  Input,
  Card,
  Typography,
  Space,
  message,
  Table,
  Tag,
  Popconfirm,
  Alert,
  Tabs,
  Modal,
  Divider
} from 'antd';
import {
  DollarOutlined,
  PlusOutlined,
  CheckOutlined,
  DeleteOutlined,
  CopyOutlined,
  SettingOutlined
} from '@ant-design/icons';
import styled from 'styled-components';
import moment from 'moment';
import 'moment/locale/fr';
import axios from 'axios';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const StyledCard = styled(Card)`
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  background: #fff;
`;

const TableCard = styled(Card)`
  margin-top: 24px;
  border-radius: 8px;
  .ant-table-wrapper {
    max-height: 400px;
    overflow-y: auto;
  }
  .ant-table {
    background: #ffffff;
  }
`;

const ContentSection = styled.div`
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const QuickAddButton = styled(Button)`
  margin: 0 8px;
  &:first-child {
    margin-left: 0;
  }
`;

const SettingsButton = styled(Button)`
  margin-left: 8px;
`;

const InvoiceManager = ({ onInvoicesAdded, isModal = false }) => {
  const [form] = Form.useForm();
  const [tabKey, setTabKey] = useState('history');
  const [continuousInvoices, setContinuousInvoices] = useState([]);
  const [punctualInvoices, setPunctualInvoices] = useState([]);
  const [historyInvoices, setHistoryInvoices] = useState([]);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hasInitialInvoices, setHasInitialInvoices] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les factures existantes
  const fetchExistingInvoices = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const invoices = response.data.map(invoice => ({
        ...invoice,
        key: invoice.id,
        date: moment(invoice.date).format('YYYY-MM-DD')
      }));
      setExistingInvoices(invoices);
      setHasInitialInvoices(invoices.length > 0);
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
      message.error('Erreur lors du chargement des factures existantes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier les factures au chargement initial
  useEffect(() => {
    fetchExistingInvoices();
  }, []);

  // Fonction helper pour obtenir la liste active des factures
  const getActiveInvoices = () => {
    switch(tabKey) {
      case 'continuous':
        return continuousInvoices;
      case 'ponctuel':
        return punctualInvoices;
      case 'history':
        return historyInvoices;
      default:
        return [];
    }
  };

  // Fonction helper pour mettre à jour la liste active
  const setActiveInvoices = (newInvoices) => {
    switch(tabKey) {
      case 'continuous':
        setContinuousInvoices(newInvoices);
        break;
      case 'ponctuel':
        setPunctualInvoices(newInvoices);
        break;
      case 'history':
        setHistoryInvoices(newInvoices);
        break;
    }
  };

  useEffect(() => {
    moment.locale('fr');
    if (tabKey === 'continuous') {
      form.setFieldsValue({ monthlyAmount: 20 });
    }
  }, [tabKey, form]);

  // ==================== MODE CONTINU ====================
  const handleGenerateContinuous = () => {
    console.log('=== DÉBUT handleGenerateContinuous ===');
    const startVal = form.getFieldValue('startDate');
    if (!startVal) {
      message.warning("Veuillez sélectionner une date de début.");
      return;
    }
    const start = moment(startVal.format('YYYY-MM-DD')).startOf('day');
    const today = moment().startOf('day');
    if (start.isAfter(today)) {
      message.warning("La date de début ne peut pas être dans le futur.");
      return;
    }
    const amount = 20;
    const newList = [];
    const monthsDiff = today.diff(start, 'months');
    for (let i = 0; i <= monthsDiff; i++) {
      const currentDate = moment(start).add(i, 'months').format('YYYY-MM-DD');
      newList.push({
        key: currentDate,
        date: currentDate,
        amount
      });
    }
    setContinuousInvoices(newList);
    console.log('=== FIN handleGenerateContinuous ===');
  };

  // ==================== MODE PONCTUEL ====================
  const addInvoices = async (months) => {
    try {
      await form.validateFields(['startDate', 'monthlyAmount']);
      const { startDate, monthlyAmount } = form.getFieldsValue(['startDate', 'monthlyAmount']);
      let baseDate;
      const currentInvoices = getActiveInvoices();
      if (currentInvoices.length === 0) {
        baseDate = startDate.clone();
      } else {
        const lastInvoice = currentInvoices[currentInvoices.length - 1];
        const lastDate = moment(lastInvoice.date, 'YYYY-MM-DD');
        baseDate = lastDate.add(1, 'month');
      }
      const today = moment().startOf('day');
      const newSet = [];
      let futureInvoices = 0;
      for (let i = 0; i < months; i++) {
        const d = baseDate.clone().add(i, 'month');
        if (d.isAfter(today)) {
          futureInvoices++;
          continue;
        }
        newSet.push({
          key: d.format('YYYY-MM-DD'),
          date: d.format('YYYY-MM-DD'),
          amount: monthlyAmount
        });
      }
      if (newSet.length > 0) {
        setPunctualInvoices((prev) => [...prev, ...newSet]);
        if (futureInvoices > 0) {
          message.warning(`${newSet.length} facture(s) ajoutée(s). ${futureInvoices} ignorée(s) car dans le futur.`);
        } else {
          message.success(`${newSet.length} facture(s) ajoutée(s).`);
        }
      } else {
        message.warning("Aucune facture ajoutée : toutes les dates sont dans le futur.");
      }
    } catch (err) {
      console.error(err);
      message.error("Erreur lors de l'ajout de factures ponctuelles.");
    }
  };

  // ==================== MODE HISTORIQUE ====================
  const parseInvoiceHistory = (rawText) => {
    if (!rawText) return;
    try {
      const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l);
      const newInvoices = [];
      let current = { date: null, amount: null };
      lines.forEach((line) => {
        const dateAttempt = moment(line, [
          'DD MMM YYYY','DD MMM. YYYY','DD MMMM YYYY','D MMM YYYY','D MMMM YYYY','DD/MM/YYYY','D/MM/YYYY'
        ], true);
        if (dateAttempt.isValid()) {
          if (current.date && current.amount) {
            newInvoices.push({
              key: current.date.format('YYYY-MM-DD'),
              date: current.date.format('YYYY-MM-DD'),
              amount: current.amount
            });
          }
          current = { date: dateAttempt.clone(), amount: null };
          return;
        }
        const match = line.match(/(\d+(?:[.,]\d+))\s*(?:\$US|\$|EUR|€)?/i);
        if (match) {
          const numeric = parseFloat(match[1].replace(',', '.'));
          current.amount = numeric;
        }
        if (current.date && current.amount) {
          newInvoices.push({
            key: current.date.format('YYYY-MM-DD'),
            date: current.date.format('YYYY-MM-DD'),
            amount: current.amount
          });
          current = { date: null, amount: null };
        }
      });
      if (current.date && current.amount) {
        newInvoices.push({
          key: current.date.format('YYYY-MM-DD'),
          date: current.date.format('YYYY-MM-DD'),
          amount: current.amount
        });
      }
      if (newInvoices.length === 0) {
        message.error("Aucune facture n'a pu être importée.");
      } else {
        setHistoryInvoices(newInvoices);
        message.success(`${newInvoices.length} facture(s) prête(s) à être importée(s). Cliquez sur Confirmer pour valider.`);
        form.setFieldValue('invoiceHistory', '');
      }
    } catch (error) {
      console.error(error);
      message.error("Erreur lors de l'importation des factures.");
    }
  };

  // ==================== CONFIRMATION ====================
  const onFinish = async () => {
    const currentInvoices = getActiveInvoices();
    if (currentInvoices.length === 0) {
      message.error("Aucune facture à ajouter.");
      return;
    }

    // Si on est en mode modal et qu'il y a des factures existantes, demander confirmation
    if (isModal && existingInvoices.length > 0) {
      Modal.confirm({
        title: 'Confirmation de mise à jour',
        content: (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Alert
              message="Attention"
              description={
                <div>
                  <p>Vous êtes sur le point d'ajouter {currentInvoices.length} nouvelle(s) facture(s).</p>
                  <p>Les {existingInvoices.length} facture(s) existante(s) seront remplacées par les nouvelles.</p>
                  <p>Cette action est irréversible.</p>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </div>
        ),
        centered: true,
        width: 500,
        okText: 'Confirmer',
        cancelText: 'Annuler',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            const token = localStorage.getItem('token');
            // Supprimer toutes les factures existantes
            for (const invoice of existingInvoices) {
              await axios.delete(`http://localhost:5000/api/invoices/${invoice.id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
            }
            // Ajouter les nouvelles
            await addNewInvoices(currentInvoices);
            message.success("Toutes les factures ont été remplacées avec succès !");
          } catch (error) {
            console.error(error);
            message.error("Erreur lors du remplacement des factures.");
          }
        }
      });
    } else {
      // Pas de factures existantes, on ajoute simplement
      await addNewInvoices(currentInvoices);
    }
  };

  // Fonction helper pour ajouter les nouvelles factures
  const addNewInvoices = async (invoices) => {
    try {
      const token = localStorage.getItem('token');
      for (const inv of invoices) {
        await axios.post('http://localhost:5000/api/invoices', {
          date: inv.date,
          amount: inv.amount
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      message.success("Factures ajoutées avec succès !");
      form.resetFields();
      setActiveInvoices([]);
      if (tabKey === 'continuous') {
        form.setFieldsValue({ monthlyAmount: 20 });
      }
      if (onInvoicesAdded) onInvoicesAdded();
      if (isModal) {
        fetchExistingInvoices();
      } else {
        // Mettre à jour l'état pour passer en mode bouton
        setHasInitialInvoices(true);
        // Recharger les factures existantes
        fetchExistingInvoices();
      }
    } catch (error) {
      console.error(error);
      message.error("Erreur lors de l'ajout des factures.");
    }
  };

  // ==================== SUPPRESSION ====================
  const removeInvoice = (key) => {
    const currentInvoices = getActiveInvoices();
    setActiveInvoices(currentInvoices.filter((inv) => inv.key !== key));
  };

  // ==================== COLONNES DU TABLEAU ====================
  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => moment(d, 'YYYY-MM-DD').format('DD/MM/YYYY')
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt) => `$${parseFloat(amt || 0).toFixed(2)}`
    },
    {
      title: 'Actions',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="Supprimer cette facture ?"
          onConfirm={() => removeInvoice(record.key)}
          okText="Oui"
          cancelText="Non"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ];

  const handleDeleteExistingInvoice = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      message.success('Facture supprimée avec succès');
      fetchExistingInvoices();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression de la facture');
    }
  };

  const existingInvoicesColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => moment(d, 'YYYY-MM-DD').format('DD/MM/YYYY')
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt) => `$${parseFloat(amt || 0).toFixed(2)}`
    },
    {
      title: 'Actions',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="Supprimer cette facture ?"
          onConfirm={() => handleDeleteExistingInvoice(record.id)}
          okText="Oui"
          cancelText="Non"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }
  ];

  const ModalManager = () => (
    <Modal
      title="Gestion des factures"
      open={isModalVisible}
      onCancel={() => setIsModalVisible(false)}
      width={800}
      centered
      footer={null}
    >
      <InvoiceManager isModal={true} onInvoicesAdded={fetchExistingInvoices} />
    </Modal>
  );

  // Modification du rendu conditionnel
  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Chargement...</div>;
  }

  // Si l'utilisateur a déjà des factures et qu'on n'est pas en mode modal, on affiche juste le bouton
  if (hasInitialInvoices && !isModal) {
    return (
      <>
        <Button
          type="primary"
          icon={<SettingOutlined />}
          onClick={() => setIsModalVisible(true)}
        >
          Gérer les factures ({existingInvoices.length})
        </Button>
        <ModalManager />
      </>
    );
  }

  // Si l'utilisateur n'a pas de factures et qu'on n'est pas en mode modal, on affiche le formulaire complet
  if (!hasInitialInvoices && !isModal) {
    return (
      <div>
        <Alert
          message="Configuration initiale des factures"
          description="Vous n'avez pas encore configuré vos factures ChatGPT Plus. Utilisez ce formulaire pour les ajouter."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Tabs
            activeKey={tabKey}
            onChange={setTabKey}
            type="card"
            style={{ background: '#fafafa', padding: '16px', borderRadius: '8px' }}
          >
            <TabPane tab="Mode continu" key="continuous">
              <StyledCard>
                <Title level={5}>Configuration abonnement (Continu)</Title>
                <ContentSection>
                  <Alert
                    message="Abonnement ChatGPT Plus"
                    description="Sélectionnez une date de début, puis nous générerons les factures mensuelles (20$/mois) jusqu'à maintenant."
                    type="info"
                    showIcon
                    style={{ marginBottom: 20 }}
                  />
                  <Form.Item
                    name="startDate"
                    label="Date de début"
                    rules={[{ required: true, message: 'Sélectionnez une date' }]}
                  >
                    <DatePicker
                      format="DD/MM/YYYY"
                      placeholder="JJ/MM/AAAA"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Button onClick={handleGenerateContinuous}>
                    Générer
                  </Button>
                </ContentSection>
              </StyledCard>
            </TabPane>

            <TabPane tab="Mode ponctuel" key="ponctuel">
              <StyledCard>
                <Title level={5}>Configuration ponctuelle</Title>
                <ContentSection>
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <Space>
                      <Form.Item
                        name="startDate"
                        label="Date de début"
                        rules={[{ required: true }]}
                      >
                        <DatePicker format="DD/MM/YYYY" placeholder="JJ/MM/AAAA" style={{ width: 140 }} />
                      </Form.Item>
                      <Form.Item
                        name="monthlyAmount"
                        label="Montant"
                        rules={[{ required: true }]}
                        initialValue={20}
                      >
                        <InputNumber
                          prefix={<DollarOutlined />}
                          min={0}
                          step={0.01}
                          style={{ width: 120 }}
                        />
                      </Form.Item>
                    </Space>
                    <div>
                      <Text strong>Ajouter rapidement :</Text>
                      <div style={{ marginTop: '12px' }}>
                        <QuickAddButton onClick={() => addInvoices(1)} icon={<PlusOutlined />}>
                          1 mois
                        </QuickAddButton>
                        <QuickAddButton onClick={() => addInvoices(3)} icon={<PlusOutlined />}>
                          3 mois
                        </QuickAddButton>
                        <QuickAddButton onClick={() => addInvoices(6)} icon={<PlusOutlined />}>
                          6 mois
                        </QuickAddButton>
                      </div>
                    </div>
                  </Space>
                </ContentSection>
              </StyledCard>
            </TabPane>

            <TabPane tab="Copier l'historique (recommandé)" key="history">
              <StyledCard>
                <Title level={5}>Importer un historique existant</Title>
                <ContentSection>
                  <Form.Item name="invoiceHistory">
                    <TextArea rows={4} placeholder="Collez votre historique ici (dates + montants)" />
                  </Form.Item>
                  <Button icon={<CopyOutlined />} onClick={() => parseInvoiceHistory(form.getFieldValue('invoiceHistory'))}>
                    Importer
                  </Button>
                </ContentSection>
              </StyledCard>
            </TabPane>
          </Tabs>

          {getActiveInvoices().length > 0 && (
            <TableCard>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Factures en attente ({getActiveInvoices().length})
                  </Title>
                  <Tag color="blue">
                    Total : $
                    {getActiveInvoices().reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
                  </Tag>
                </Space>
                <Table
                  columns={columns}
                  dataSource={getActiveInvoices()}
                  pagination={false}
                  size="small"
                  scroll={{ y: 300 }}
                />
              </Space>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                icon={<CheckOutlined />}
                style={{ marginTop: 20 }}
              >
                Confirmer
              </Button>
            </TableCard>
          )}
        </Form>
      </div>
    );
  }

  // En mode modal, on affiche toujours le formulaire complet avec les factures existantes
  return (
    <div>
      <Title level={4} style={{ marginBottom: '24px' }}>
        Choisissez un mode d'ajout de factures (historique recommandé) :
      </Title>

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Tabs
          activeKey={tabKey}
          onChange={setTabKey}
          type="card"
          style={{ background: '#fafafa', padding: '16px', borderRadius: '8px' }}
        >
          <TabPane tab="Mode continu" key="continuous">
            <StyledCard>
              <Title level={5}>Configuration abonnement (Continu)</Title>
              <ContentSection>
                <Alert
                  message="Abonnement ChatGPT Plus"
                  description="Sélectionnez une date de début, puis nous générerons les factures mensuelles (20$/mois) jusqu'à maintenant."
                  type="info"
                  showIcon
                  style={{ marginBottom: 20 }}
                />
                <Form.Item
                  name="startDate"
                  label="Date de début"
                  rules={[{ required: true, message: 'Sélectionnez une date' }]}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    placeholder="JJ/MM/AAAA"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                <Button onClick={handleGenerateContinuous}>
                  Générer
                </Button>
              </ContentSection>
            </StyledCard>
          </TabPane>

          <TabPane tab="Mode ponctuel" key="ponctuel">
            <StyledCard>
              <Title level={5}>Configuration ponctuelle</Title>
              <ContentSection>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Space>
                    <Form.Item
                      name="startDate"
                      label="Date de début"
                      rules={[{ required: true }]}
                    >
                      <DatePicker format="DD/MM/YYYY" placeholder="JJ/MM/AAAA" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item
                      name="monthlyAmount"
                      label="Montant"
                      rules={[{ required: true }]}
                      initialValue={20}
                    >
                      <InputNumber
                        prefix={<DollarOutlined />}
                        min={0}
                        step={0.01}
                        style={{ width: 120 }}
                      />
                    </Form.Item>
                  </Space>
                  <div>
                    <Text strong>Ajouter rapidement :</Text>
                    <div style={{ marginTop: '12px' }}>
                      <QuickAddButton onClick={() => addInvoices(1)} icon={<PlusOutlined />}>
                        1 mois
                      </QuickAddButton>
                      <QuickAddButton onClick={() => addInvoices(3)} icon={<PlusOutlined />}>
                        3 mois
                      </QuickAddButton>
                      <QuickAddButton onClick={() => addInvoices(6)} icon={<PlusOutlined />}>
                        6 mois
                      </QuickAddButton>
                    </div>
                  </div>
                </Space>
              </ContentSection>
            </StyledCard>
          </TabPane>

          <TabPane tab="Copier l'historique (recommandé)" key="history">
            <StyledCard>
              <Title level={5}>Importer un historique existant</Title>
              <ContentSection>
                <Form.Item name="invoiceHistory">
                  <TextArea rows={4} placeholder="Collez votre historique ici (dates + montants)" />
                </Form.Item>
                <Button icon={<CopyOutlined />} onClick={() => parseInvoiceHistory(form.getFieldValue('invoiceHistory'))}>
                  Importer
                </Button>
              </ContentSection>
            </StyledCard>
          </TabPane>
        </Tabs>

        {getActiveInvoices().length > 0 && (
          <TableCard>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Title level={5} style={{ margin: 0 }}>
                  Factures en attente ({getActiveInvoices().length})
                </Title>
                <Tag color="blue">
                  Total : $
                  {getActiveInvoices().reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
                </Tag>
              </Space>
              <Table
                columns={columns}
                dataSource={getActiveInvoices()}
                pagination={false}
                size="small"
                scroll={{ y: 300 }}
              />
            </Space>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              icon={<CheckOutlined />}
              style={{ marginTop: 20 }}
            >
              Confirmer
            </Button>
          </TableCard>
        )}
      </Form>

      {isModal && existingInvoices.length > 0 && (
        <>
          <Divider>Factures existantes</Divider>
          <TableCard>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Title level={5} style={{ margin: 0 }}>
                  Factures enregistrées ({existingInvoices.length})
                </Title>
                <Tag color="blue">
                  Total : $
                  {existingInvoices.reduce((sum, invoice) => {
                    const amount = parseFloat(invoice.amount) || 0;
                    return sum + amount;
                  }, 0).toFixed(2)}
                </Tag>
              </Space>
              <Table
                columns={existingInvoicesColumns}
                dataSource={existingInvoices}
                pagination={false}
                size="small"
                scroll={{ y: 300 }}
              />
            </Space>
          </TableCard>
        </>
      )}
    </div>
  );
};

export default InvoiceManager;
