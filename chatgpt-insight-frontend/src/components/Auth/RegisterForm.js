// src/components/Auth/RegisterForm.js
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

const clearIndexedDB = async () => {
  try {
    const databases = await window.indexedDB.databases();
    databases.forEach(db => {
      window.indexedDB.deleteDatabase(db.name);
    });
  } catch (error) {
    console.error('Erreur lors de la suppression des données IndexedDB:', error);
  }
};

const RegisterForm = ({ redirectTo }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    if (values.password !== values.confirmPassword) {
      message.error(t('auth.register.form.confirmPassword.mismatch'));
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/register',
        {
          email: values.email,
          password: values.password,
          full_name: values.full_name
        }
      );
      await clearIndexedDB();
      localStorage.setItem('token', response.data.token);
      message.success(t('auth.register.form.success'));
      console.log('[RegisterForm] Redirection vers:', redirectTo || '/home');
      navigate(redirectTo || '/home');
    } catch (error) {
      message.error(error.response?.data?.error || t('auth.register.form.error'));
    } finally {
      setLoading(false);
    }
  };

  // Exemple : si redirectTo === '/checkout', on peut changer le texte du bouton
  const buttonText = redirectTo === '/checkout'
    ? t('auth.register.form.submitPayment') // à ajouter dans votre fichier de traduction
    : t('auth.register.form.submit');

  return (
    <StyledForm
      name="register"
      onFinish={onFinish}
      autoComplete="off"
    >
      <Form.Item
        name="full_name"
        rules={[
          { required: true, message: t('auth.register.form.fullName.required') }
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('auth.register.form.fullName.placeholder')}
        />
      </Form.Item>

      <Form.Item
        name="email"
        rules={[
          { required: true, message: t('auth.register.form.email.required') },
          { type: 'email', message: t('auth.register.form.email.invalid') }
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('auth.register.form.email.placeholder')}
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: t('auth.register.form.password.required') },
          { min: 8, message: t('auth.register.form.password.minLength') }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('auth.register.form.password.placeholder')}
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        rules={[
          { required: true, message: t('auth.register.form.confirmPassword.required') },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(
                new Error(t('auth.register.form.confirmPassword.mismatch'))
              );
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('auth.register.form.confirmPassword.placeholder')}
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

export default RegisterForm;
