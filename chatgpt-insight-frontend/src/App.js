// src/App.js
import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import styled from 'styled-components';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from './components/layout/AppHeader';
import FooterComponent from './components/layout/Footer';
import HomePage from './components/HomePage/HomePage';
import LanguageSelector from './components/LanguageSelector/LanguageSelector';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PersonalSpace from './pages/PersonalSpace';
import AnalysisPage from './pages/AnalysisPage';
import LandingPage from './pages/LandingPage';
import PremiumPage from './pages/PremiumPage';
import CheckoutPage from './pages/CheckoutPage';
import AccountPage from './pages/AccountPage';
import axios from 'axios';

const { Content } = Layout;

const StyledLayout = styled(Layout)`
  min-height: 100vh;
`;

const StyledContent = styled(Content)`
  background: #ffffff;
  padding: 24px;
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
  min-height: calc(100vh - 64px - 69px);
`;

function App() {
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      await axios.get('http://localhost:5000/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };

  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return <Navigate to="/" />;
    }
    return children;
  };

  const PublicRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (token) {
      return <Navigate to="/home" />;
    }
    return children;
  };

  return (
    <Router>
      <StyledLayout>
        <AppHeader isUploading={isUploading}>
          <LanguageSelector isDisabled={isUploading} />
        </AppHeader>
        <StyledContent>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage setError={setError} setIsUploading={setIsUploading} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analysis"
              element={
                <ProtectedRoute>
                  <AnalysisPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/personal"
              element={
                <ProtectedRoute>
                  <PersonalSpace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/premium"
              element={<PremiumPage />}
            />
            <Route
              path="/checkout"
              element={
                // On veut être sûr que l'utilisateur est connecté pour payer,
                // donc on peut rendre cette route protégée, ou bien
                // laisser PublicRoute et vérifier le token dans CheckoutPage.
                <CheckoutPage />
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </StyledContent>
        <FooterComponent />
      </StyledLayout>
    </Router>
  );
}

export default App;
