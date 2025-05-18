// src/components/Auth/LoginForm.js
import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const StyledForm = styled(Form)`
  max-width: 300px;
  margin: 0 auto;
`;

const LoginForm = ({ redirectTo }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        values
      );
      localStorage.setItem('token', response.data.token);
      message.success(t('auth.login.form.success'));
      console.log('[LoginForm] Redirection vers:', redirectTo || '/home');
      navigate(redirectTo || '/home');
    } catch (error) {
      message.error(error.response?.data?.error || t('auth.login.form.error'));
    } finally {
      setLoading(false);
    }
  };

  // Exemple : si redirectTo === '/checkout', on peut changer le texte du bouton
  const buttonText = redirectTo === '/checkout'
    ? t('auth.login.form.submitPayment') // vous pouvez ajouter cette clé dans vos traductions
    : t('auth.login.form.submit');

  return (
    <StyledForm
      name="login"
      onFinish={onFinish}
      autoComplete="off"
    >
      <Form.Item
        name="email"
        rules={[
          { required: true, message: t('auth.login.form.email.required') },
          { type: 'email', message: t('auth.login.form.email.invalid') }
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('auth.login.form.email.placeholder')}
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: t('auth.login.form.password.required') }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('auth.login.form.password.placeholder')}
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          {buttonText}
        </Button>
      </Form.Item>
    </StyledForm>
  );
};

export default LoginForm;
