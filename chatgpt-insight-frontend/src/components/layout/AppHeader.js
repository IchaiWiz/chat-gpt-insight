import React from "react";
import { Layout, Typography, Space, Button, Dropdown } from "antd";
import {
  BarChartOutlined,
  UserOutlined,
  IdcardOutlined,
  AreaChartOutlined,
  SettingOutlined,
  LoginOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import useIndexedDBData from "../../hooks/useIndexedDBData";

const { Header } = Layout;
const { Title } = Typography;

const StyledHeader = styled(Header)`
  background: #ffffff;
  padding: 0 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 64px;
  border-bottom: 1px solid #f0f0f0;

  @media (max-width: 768px) {
    padding: 0 20px;
  }
`;

const Logo = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;

  h3 {
    color: #1890ff;
    margin: 0;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    gap: 8px;
  }

  .ant-btn {
    height: 36px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%) scaleX(0);
      width: 24px;
      height: 3px;
      background: #1890ff;
      border-radius: 2px;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    &.ant-btn-primary:not([disabled]) {
      background: #1890ff;
      border-color: #1890ff;
      color: white;

      &:hover {
        background: #40a9ff;
        border-color: #40a9ff;
      }

      &.active {
        background: linear-gradient(135deg, #1890ff, #096dd9);
        border-color: #096dd9;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
        transform: translateY(-1px);

        &::after {
          transform: translateX(-50%) scaleX(1);
        }

        &:hover {
          background: linear-gradient(135deg, #40a9ff, #0050b3);
          border-color: #0050b3;
        }
      }

      &[ghost] {
        background: transparent;
        border-color: #1890ff;
        color: #1890ff;

        &:hover {
          background: rgba(24, 144, 255, 0.1);
          border-color: #40a9ff;
          color: #40a9ff;
        }
      }
    }

    &[disabled] {
      background: #f5f5f5;
      border-color: #d9d9d9;
      color: rgba(0, 0, 0, 0.25);
    }
  }

  .ant-dropdown-trigger {
    &.active {
      background: linear-gradient(135deg, #1890ff, #096dd9);
      border-color: #096dd9;
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
      transform: translateY(-1px);

      &::after {
        transform: translateX(-50%) scaleX(1);
      }
    }
  }
`;

const AppHeader = ({ children, isUploading }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const hasData = useIndexedDBData();

  const handleLogout = () => {
    if (isUploading) return;
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleLogoClick = () => {
    if (isUploading) return;
    if (token) {
      navigate("/home");
    } else {
      navigate("/");
    }
  };

  const menuItems = token ? [
    {
      key: 'account',
      label: t('header.manageAccount'),
      icon: <SettingOutlined />,
      onClick: () => !isUploading && navigate('/account'),
      disabled: isUploading
    },
    {
      key: 'logout',
      label: t('header.logout'),
      icon: <LoginOutlined />,
      onClick: handleLogout,
      disabled: isUploading
    }
  ] : [
    {
      key: 'login',
      label: t('auth.login.form.submit'),
      icon: <LoginOutlined />,
      onClick: () => !isUploading && navigate('/login'),
      disabled: isUploading
    },
    {
      key: 'register',
      label: t('auth.register.form.submit'),
      icon: <UserAddOutlined />,
      onClick: () => !isUploading && navigate('/register'),
      disabled: isUploading
    }
  ];

  return (
    <StyledHeader>
      <Logo onClick={handleLogoClick} style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}>
        <BarChartOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
        <Title level={3}>{t("header.title")}</Title>
      </Logo>

      <RightSection>
        {children}
        {token && (
          <>
            <Button
              type="primary"
              icon={<AreaChartOutlined />}
              onClick={() => !isUploading && navigate("/analysis")}
              className={location.pathname === "/analysis" ? "active" : ""}
              disabled={!hasData || isUploading}
              title={!hasData ? t("header.personalSpaceDisabled") : isUploading ? t("header.uploadInProgress") : ""}
            >
              {t("common.analyze")}
            </Button>
            <Button
              type="primary"
              icon={<IdcardOutlined />}
              onClick={() => !isUploading && navigate("/personal")}
              className={location.pathname === "/personal" ? "active" : ""}
              disabled={!hasData || isUploading}
              title={!hasData ? t("header.personalSpaceDisabled") : isUploading ? t("header.uploadInProgress") : ""}
            >
              {t("header.personalSpace")}
            </Button>
          </>
        )}
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" disabled={isUploading}>
          <Button 
            type="primary" 
            icon={<UserOutlined />} 
            className={location.pathname === "/account" ? "active" : ""}
            disabled={isUploading}
          />
        </Dropdown>
      </RightSection>
    </StyledHeader>
  );
};

export default AppHeader;
