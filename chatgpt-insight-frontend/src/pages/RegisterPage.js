// src/pages/RegisterPage.js
import React from 'react';
import AuthLayout from '../components/Auth/AuthLayout';
import RegisterForm from '../components/Auth/RegisterForm';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const RegisterPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || '/home';

  console.log('[RegisterPage] redirectTo:', redirectTo);
  console.log('[RegisterPage] location.state:', location.state);

  // Exemple: si on vient de premium pour payer, on pourrait changer le linkText
  // en "Vous avez déjà un compte ? Connectez-vous pour poursuivre le paiement"
  const linkText = redirectTo === '/checkout'
    ? t('auth.register.linkTextPayment') // "Vous avez déjà un compte ? Connectez-vous pour payer"
    : t('auth.register.hasAccount');

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      linkText={linkText}
      linkTo={{
        pathname: '/login',
        state: { redirectTo }
      }}
    >
      <RegisterForm redirectTo={redirectTo} />
    </AuthLayout>
  );
};

export default RegisterPage;
