// src/pages/LoginPage.js
import React from 'react';
import AuthLayout from '../components/Auth/AuthLayout';
import LoginForm from '../components/Auth/LoginForm';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';

const LoginPage = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || '/home';

  console.log('[LoginPage] redirectTo:', redirectTo);
  console.log('[LoginPage] location.state:', location.state);

  // Exemple: si on vient de la page premium, on peut adapter le linkText :
  const linkText = redirectTo === '/checkout'
    ? t('auth.login.linkTextPayment') // "Pas de compte ? Inscrivez-vous pour payer"
    : t('auth.login.noAccount');      // "Pas de compte ?"

  // Ici, on indique toujours '/register' mais on pourrait utiliser <Link> plus élaboré
  // si on voulait passer un state supplémentaire. Pour l'instant on garde simple.
  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      linkText={linkText}
      linkTo={{
        pathname: '/register',
        state: { redirectTo }
      }}
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthLayout>
  );
};

export default LoginPage;
