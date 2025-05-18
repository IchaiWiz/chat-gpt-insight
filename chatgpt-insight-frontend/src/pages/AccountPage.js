import React, { useState, useEffect } from 'react';
import { Card, Tabs, Typography, Button, Form, Input, Spin, Tag, Modal, Select, Space, Divider, Alert } from 'antd';
import { UserOutlined, LockOutlined, CrownOutlined, CheckCircleOutlined, StopOutlined, WarningOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import styled from 'styled-components';

const { Title } = Typography;
const { TabPane } = Tabs;

const StyledCard = styled(Card)`
  margin: 20px;
  .ant-card-head-title {
    font-size: 20px;
  }
`;

const CancellationModal = styled(Modal)`
  .retention-info {
    margin: 20px 0;
    padding: 20px;
    background: #fff7e6;
    border-radius: 8px;
    border: 1px solid #ffd591;
  }
  .benefits-list {
    margin: 15px 0;
    padding: 0;
    list-style: none;
    li {
      margin: 10px 0;
      padding: 10px;
      background: white;
      border-radius: 6px;
      border: 1px solid #d9d9d9;
      display: flex;
      align-items: center;
      gap: 8px;
      .anticon {
        color: #faad14;
      }
    }
  }
  .usage-stats {
    background: #f6ffed;
    border: 1px solid #b7eb8f;
    border-radius: 6px;
    padding: 15px;
    margin: 20px 0;
  }
  &.ant-modal-centered {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const SubscriptionCard = styled(Card)`
  background: ${props => props.isPremium ? 'linear-gradient(135deg, #f6ffed, #e6f7ff)' : '#ffffff'};
  border: 1px solid ${props => props.isPremium ? '#b7eb8f' : '#d9d9d9'};
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.08);
  }
  .subscription-type {
    font-size: 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .analysis-stats {
    padding: 20px;
    background: rgba(255,255,255,0.8);
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid ${props => props.isPremium ? '#91d5ff' : '#f0f0f0'};
  }
  .premium-badge {
    background: linear-gradient(45deg, #ffd700, #ffa940);
    color: #873800;
    padding: 4px 12px;
    border-radius: 16px;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

const PremiumButton = styled(Button)`
  && {
    background: linear-gradient(45deg, #1890ff, #722ed1) !important;
    border: none !important;
    height: 40px;
    font-size: 16px;
    color: white !important;
    transition: opacity 0.3s ease;
    &:hover, &:focus, &:active {
      opacity: 0.85;
    }
    &::after {
      display: none !important;
    }
  }
`;

const PremiumFeatures = styled.div`
  margin: 20px 0;
  padding: 15px;
  background: #f9f0ff;
  border-radius: 8px;
  .price {
    font-size: 24px;
    color: #722ed1;
    margin-bottom: 15px;
    text-align: center;
  }
  .feature-list {
    margin: 0;
    padding: 0;
    list-style: none;
    li {
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      .anticon {
        color: #722ed1;
        margin-right: 8px;
      }
    }
  }
`;

const API_BASE_URL = process.env.REACT_APP_API_URL;
const AccountPage = () => {
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState(null);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [showRetentionOffers, setShowRetentionOffers] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([ fetchUserData(), fetchSubscriptionData(), fetchPrices() ]);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      }
      setLoading(false);
    };
    init();
  }, []);

  const fetchPrices = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/payment/prices');
      setPrices(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des prix:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setUserData(response.data);
      form.setFieldsValue({
        email: response.data.email,
        full_name: response.data.full_name
      });
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/user/subscription`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setSubscription(response.data);
    } catch (error) {
      setSubscription(null);
      console.error('Erreur lors de la récupération de la souscription:', error);
    }
  };

  const handleUpdateProfile = async (values) => {
    try {
      await axios.put(`${API_BASE_URL}/api/user/profile`, values, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
    }
  };

  const handleUpdatePassword = async (values) => {
    try {
      await axios.put(`${API_BASE_URL}/api/user/password`, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      passwordForm.resetFields();
    } catch (error) {
      if (error.response?.status === 400) {
        passwordForm.setFields([
          {
            name: 'currentPassword',
            errors: [t('validation.currentPasswordIncorrect')]
          }
        ]);
      } else {
        console.error('Erreur lors de la mise à jour du mot de passe:', error);
      }
    }
  };

  const handleCancellationRequest = () => {
    setShowCancellationModal(true);
  };

  const handleCancellationReasonSubmit = () => {
    if (cancellationReason) {
      setShowRetentionOffers(true);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleCancelSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/payment/cancel-subscription',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setShowCancellationModal(false);
        const endDate = response.data.expiry_date ? formatDate(response.data.expiry_date) : '';
        Modal.success({
          title: t('account.subscription.cancelSuccess.title'),
          icon: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '36px' }} />,
          content: (
            <div style={{ textAlign: 'center' }}>
              <Typography.Paragraph style={{ marginBottom: '16px' }}>
                {t('account.subscription.cancelSuccess.description', { date: endDate })}
              </Typography.Paragraph>
              <Typography.Paragraph style={{ marginBottom: '0' }}>
                {t('account.subscription.cancelSuccess.comeback')}
              </Typography.Paragraph>
            </div>
          ),
          centered: true,
          width: 400,
          okText: 'OK'
        });
        setUserData(prev => ({ ...prev, subscription_type: 'free' }));
        fetchSubscriptionData();
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
    }
  };

  const handleKeepSubscription = () => {
    setShowCancellationModal(false);
    setShowRetentionOffers(false);
    setCancellationReason('');
  };

  const formatPrice = (priceData) => {
    if (!priceData) return '';
    const amount = priceData.amount / 100;
    const currency = priceData.currency.toUpperCase();
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const isPremiumActive = () => {
    if (!subscription) return false;
    const now = new Date();
    const expiryDate = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
    return expiryDate && expiryDate > now;
  };

  const renderExpiryInfo = () => {
    if (!subscription) return null;
    const expiryDate = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
    const lastPaymentDate = subscription.latest_invoice?.date ? new Date(subscription.latest_invoice.date) : null;
    if (expiryDate) {
      return (
        <div className="expiry-date" style={{ color: '#8c8c8c', fontSize: '14px' }}>
          <span>{t('account.subscription.expiryDate')}: </span>
          <strong>{formatDate(expiryDate)}</strong>
        </div>
      );
    } else if (lastPaymentDate) {
      const nextBillingDate = new Date(lastPaymentDate);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      return (
        <div className="expiry-date" style={{ color: '#8c8c8c', fontSize: '14px' }}>
          <span>{t('account.subscription.nextBilling')}: </span>
          <strong>{formatDate(nextBillingDate)}</strong>
        </div>
      );
    }
    return null;
  };

  const renderSubscriptionSection = () => {
    const isPremium = isPremiumActive();
    return (
      <StyledCard title={t('account.subscription.title')}>
        <SubscriptionCard isPremium={isPremium}>
          <div
            className="subscription-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}
          >
            <div className="subscription-type">
              <Tag
                color={isPremium ? 'gold' : 'default'}
                icon={isPremium ? <CrownOutlined /> : null}
                style={{ padding: '4px 12px', fontSize: '16px' }}
              >
                {t(`account.subscription.${isPremium ? 'premium' : 'free'}.name`)}
              </Tag>
            </div>
            {isPremium && renderExpiryInfo()}
          </div>
          <div className="analysis-stats">
            <Typography.Title
              level={4}
              style={{ marginBottom: '16px', color: isPremium ? '#722ed1' : '#262626' }}
            >
              {t('account.subscription.analysisCount')}
            </Typography.Title>
            {isPremium ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0f5ff 0%, #e6fffb 100%)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '24px',
                    background: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid #f0f0f0'
                  }}
                >
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div
                      style={{
                        background: 'linear-gradient(45deg, #722ed1, #1890ff)',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}
                    >
                      <CrownOutlined style={{ color: 'white', fontSize: '20px' }} />
                    </div>
                    <Typography.Title level={3} style={{ margin: '0 0 4px', color: '#722ed1' }}>
                      {userData?.monthly_analysis?.count || 0}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      {t('account.subscription.unlimited')}
                    </Typography.Text>
                  </div>
                  <Divider type="vertical" style={{ height: 'auto', margin: '0 24px' }} />
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px'
                      }}
                    >
                      📅
                    </div>
                    <Typography.Title level={4} style={{ margin: '0 0 4px', color: '#262626' }}>
                      {formatDate(subscription?.current_period_end || subscription?.latest_invoice?.date)}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      {subscription?.current_period_end
                        ? t('account.subscription.expiryDate')
                        : t('account.subscription.nextBilling')}
                    </Typography.Text>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {!subscription?.current_period_end && (
                    <Button
                      type="text"
                      danger
                      onClick={handleCancellationRequest}
                      icon={<StopOutlined />}
                      size="small"
                      style={{ 
                        fontSize: '12px',
                        opacity: 0.7,
                        height: '32px'
                      }}
                    >
                      {t('account.subscription.requestCancellation')}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <PremiumFeatures>
                  <div className="price">
                    {prices?.[i18n.language === 'en' ? 'usd' : 'eur'] ? (
                      <>
                        {formatPrice(prices[i18n.language === 'en' ? 'usd' : 'eur'])} / {t('checkout.period')}
                      </>
                    ) : (
                      <Spin size="small" />
                    )}
                  </div>
                  <ul className="feature-list">
                    {t('account.subscription.premium.features', { returnObjects: true }).map((feature, index) => (
                      <li key={index}>
                        <CheckCircleOutlined /> {feature}
                      </li>
                    ))}
                  </ul>
                </PremiumFeatures>
                <PremiumButton
                  type="primary"
                  icon={<CrownOutlined />}
                  href="/premium"
                  size="large"
                  style={{ marginTop: '16px', minWidth: '200px' }}
                >
                  {t('account.subscription.subscribe')}
                </PremiumButton>
              </div>
            )}
          </div>
        </SubscriptionCard>
      </StyledCard>
    );
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}><Spin size="large" /></div>;
  }

  const userBenefits = t('account.subscription.retention.benefits', { returnObjects: true });
  const renderPriceMessage = () => {
    if (cancellationReason === 'too_expensive') {
      return (
        <div style={{
          background: '#e6f7ff',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '15px',
          border: '1px solid #91d5ff'
        }}>
          <Typography.Title level={5} style={{ color: '#1890ff', marginBottom: '8px' }}>
            <InfoCircleOutlined style={{ marginRight: '8px' }} />
            {t('account.subscription.cancellation.priceMessage.title')}
          </Typography.Title>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {t('account.subscription.cancellation.priceMessage.description')}
          </Typography.Paragraph>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <Title level={2} style={{ margin: '20px' }}>{t('account.title')}</Title>
      <Tabs defaultActiveKey="1" style={{ margin: '0 20px' }}>
        <TabPane tab={<span><UserOutlined />{t('account.tabs.profile')}</span>} key="1">
          <StyledCard title={t('account.profile.title')}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateProfile}
            >
              <Form.Item
                name="email"
                label={t('account.profile.email')}
                rules={[
                  { required: true, message: t('validation.emailRequired') },
                  { type: 'email', message: t('validation.emailValid') }
                ]}
              >
                <Input prefix={<UserOutlined />} disabled />
              </Form.Item>
              <Form.Item
                name="full_name"
                label={t('account.profile.fullName')}
                rules={[{ required: true, message: t('validation.nameRequired') }]}
              >
                <Input prefix={<UserOutlined />} />
              </Form.Item>
              {userData && (
                <>
                  <Form.Item label={t('account.profile.createdAt')}>
                    <Input
                      value={new Date(userData.created_at).toLocaleDateString()}
                      disabled
                    />
                  </Form.Item>
                  {userData.last_login && (
                    <Form.Item label={t('account.profile.lastLogin')}>
                      <Input
                        value={new Date(userData.last_login).toLocaleString()}
                        disabled
                      />
                    </Form.Item>
                  )}
                </>
              )}
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  {t('account.profile.update')}
                </Button>
              </Form.Item>
            </Form>
          </StyledCard>

          <StyledCard title={t('account.password.title')}>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleUpdatePassword}
            >
              <Form.Item
                name="currentPassword"
                label={t('account.password.current')}
                rules={[{ required: true, message: t('validation.passwordRequired') }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label={t('account.password.new')}
                rules={[
                  { required: true, message: t('validation.passwordRequired') },
                  { min: 8, message: t('validation.passwordLength') }
                ]}
                validateFirst={true}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label={t('account.password.confirm')}
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: t('validation.confirmRequired') },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(t('validation.passwordMatch'));
                    },
                  }),
                ]}
                validateFirst={true}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  {t('account.password.update')}
                </Button>
              </Form.Item>
            </Form>
          </StyledCard>
        </TabPane>

        <TabPane tab={<span><CrownOutlined />{t('account.tabs.subscription')}</span>} key="2">
          {renderSubscriptionSection()}
        </TabPane>
      </Tabs>

      <CancellationModal
        visible={showCancellationModal}
        title={t('account.subscription.cancellation.title')}
        onCancel={() => setShowCancellationModal(false)}
        footer={null}
        width={600}
        centered={true}
        className="ant-modal-centered"
      >
        {!showRetentionOffers ? (
          <>
            <Typography.Paragraph>
              {t('account.subscription.cancellation.confirmation')}
            </Typography.Paragraph>
            <Form layout="vertical">
              <Form.Item
                label={t('account.subscription.cancellation.reasonLabel')}
                required
              >
                <Select
                  value={cancellationReason}
                  onChange={setCancellationReason}
                  placeholder={t('account.subscription.cancellation.reasonPlaceholder')}
                >
                  <Select.Option value="too_expensive">
                    {t('account.subscription.cancellation.reasons.tooExpensive')}
                  </Select.Option>
                  <Select.Option value="not_using">
                    {t('account.subscription.cancellation.reasons.notUsing')}
                  </Select.Option>
                  <Select.Option value="missing_features">
                    {t('account.subscription.cancellation.reasons.missingFeatures')}
                  </Select.Option>
                  <Select.Option value="other">
                    {t('account.subscription.cancellation.reasons.other')}
                  </Select.Option>
                </Select>
              </Form.Item>
              {renderPriceMessage()}
              <Button type="primary" onClick={handleCancellationReasonSubmit} style={{ marginTop: '15px' }}>
                {t('account.subscription.cancellation.continue')}
              </Button>
            </Form>
          </>
        ) : (
          <div className="retention-info">
            <Typography.Title level={4}>
              {t('account.subscription.retention.title')}
            </Typography.Title>
            <Typography.Paragraph>
              {t('account.subscription.retention.description')}
            </Typography.Paragraph>
            <ul className="benefits-list">
              {userBenefits.map((benefit, index) => (
                <li key={index}>
                  <WarningOutlined />
                  {benefit}
                </li>
              ))}
            </ul>
            {userData?.monthly_analysis && (
              <div className="usage-stats">
                <Typography.Title level={5}>
                  {t('account.subscription.retention.usage.title')}
                </Typography.Title>
                <Typography.Paragraph>
                  {t('account.subscription.retention.usage.description')}
                </Typography.Paragraph>
                <ul>
                  <li>{t('account.subscription.retention.usage.analyses', { count: userData.monthly_analysis.count })}</li>
                  <li>{t('account.subscription.retention.usage.features', { count: 4 })}</li>
                  {userData.monthly_analysis.count > 5 && (
                    <li>{t('account.subscription.retention.usage.savings', { amount: formatPrice({ amount: (userData.monthly_analysis.count - 5) * 0.5 * 100, currency: 'EUR' }) })}</li>
                  )}
                </ul>
              </div>
            )}
            {subscription?.current_period_end && (
              <Alert
                message={t('account.subscription.cancellation.confirmCancel.title')}
                description={
                  <>
                    {t('account.subscription.cancellation.confirmCancel.description')}
                    <br />
                    <strong>
                      {t('account.subscription.cancellation.confirmCancel.nextBillingInfo', {
                        date: formatDate(subscription.current_period_end)
                      })}
                    </strong>
                  </>
                }
                type="info"
                showIcon
                style={{ marginBottom: 20 }}
              />
            )}
            <Divider />
            <Space>
              <Button type="primary" onClick={handleKeepSubscription}>
                {t('account.subscription.retention.keepSubscription')}
              </Button>
              <Button danger onClick={handleCancelSubscription}>
                {t('account.subscription.retention.confirmCancel')}
              </Button>
            </Space>
          </div>
        )}
      </CancellationModal>
    </div>
  );
};

export default AccountPage;
