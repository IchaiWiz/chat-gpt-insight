// src/components/ZipFileUploader/ZipFileUploader.js
import React, { useState, useEffect } from 'react';
import { Button, message, Tooltip, Typography, Upload, Progress, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import io from 'socket.io-client';
import { saveToIndexedDB, getFromIndexedDB, clearFromIndexedDB } from './indexedDB';

const { Text } = Typography;
const Container = styled.div`
  text-align: center;
`;

const LoadingDots = styled.span`
  &::after {
    display: inline-block;
    animation: ellipsis 1.5s infinite;
    content: ".";
    width: 1em;
    text-align: left;
  }
  @keyframes ellipsis {
    0% { content: "."; }
    33% { content: ".."; }
    66% { content: "..."; }
  }
`;

function ZipFileUploader({ setError, setIsUploading }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressDescription, setProgressDescription] = useState('');
  const [socket, setSocket] = useState(null);
  const [isStepLoading, setIsStepLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [hasExistingData, setHasExistingData] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('analysisProgress', (data) => {
      setProgress(data.percentage);
      setProgressDescription(data.description);
      setLastUpdateTime(Date.now());
      setIsStepLoading(true);
    });

    // Vérifier s'il y a des données existantes
    const checkExistingData = async () => {
      try {
        const savedData = await getFromIndexedDB();
        setHasExistingData(!!savedData);
      } catch (err) {
        console.error('Erreur lors de la vérification des données:', err);
      }
    };

    checkExistingData();

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    let timeoutId;
    if (lastUpdateTime) {
      timeoutId = setTimeout(() => {
        setIsStepLoading(true);
      }, 1000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [lastUpdateTime]);

  const handleFileChange = (file) => {
    if (!file) return false;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      message.error(t('upload.pleaseSelectZip'));
      return false;
    }
    setSelectedFile(file);
    return false;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      message.error(t('upload.noFileSelected'));
      return;
    }

    if (hasExistingData) {
      const confirmed = window.confirm(t('upload.confirmOverwrite'));
      if (!confirmed) {
        return;
      }
    }

    setUploading(true);
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('zipfile', selectedFile);

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
        headers
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('upload.uploadError'));
      }

      try {
        await saveToIndexedDB(result);
        setHasExistingData(true);
        message.success(t('upload.uploadSuccess'));
        navigate('/analysis');
      } catch (err) {
        console.error('Erreur lors de la sauvegarde dans IndexedDB:', err);
        setError(t('upload.storageError'));
        message.error(t('upload.storageError'));
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      message.error(t('upload.uploadError') + ": " + err.message);
    } finally {
      setUploading(false);
      setIsUploading(false);
      setProgress(100);
    }
  };

  const handleClearData = async () => {
    try {
      await clearFromIndexedDB();
      setHasExistingData(false);
      message.success(t('upload.dataCleared'));
    } catch (err) {
      console.error('Erreur lors de la suppression des données:', err);
      message.error(t('upload.clearError'));
    }
  };

  const handleViewExistingData = () => {
    navigate('/analysis');
  };

  return (
    <Container>
      {hasExistingData && (
        <Card style={{ marginBottom: '20px', backgroundColor: '#f0f7ff', borderColor: '#91caff' }}>
          <Text>
            {t('upload.existingDataFound')}
          </Text>
          <div style={{ marginTop: '10px' }}>
            <Button 
              type="primary"
              onClick={handleViewExistingData}
              style={{ marginRight: '10px' }}
            >
              {t('upload.viewExistingData')}
            </Button>
            <Button 
              type="link" 
              danger
              onClick={handleClearData}
            >
              {t('upload.clearData')}
            </Button>
          </div>
        </Card>
      )}

      <Upload.Dragger
        name="zipfile"
        beforeUpload={handleFileChange}
        multiple={false}
        showUploadList={true}
        onRemove={() => setSelectedFile(null)}
        accept=".zip"
      >
        <p className="ant-upload-drag-icon">
          <UploadOutlined />
        </p>
        <p className="ant-upload-text">
          {t('upload.clickToSelect')}
        </p>
        <p className="ant-upload-hint">
          ({t('upload.fileFormat')})
        </p>
        <p className="ant-upload-hint" style={{ color: '#ff4d4f' }}>
          {t('upload.processingTimeWarning')}
        </p>
      </Upload.Dragger>

      <div style={{ marginTop: '10px' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {t('upload.storageInfo')}
        </Text>
        {hasExistingData && (
          <Text type="warning" style={{ fontSize: '12px', display: 'block', marginTop: '5px' }}>
            {t('upload.overwriteWarning')}
          </Text>
        )}
      </div>

      {uploading && (
        <div style={{ marginTop: '20px' }}>
          <Progress 
            percent={progress} 
            status="active" 
            format={() => `${Math.round(progress)}%`}
          />
          {progressDescription && (
            <Text type="secondary" style={{ display: 'block', marginTop: '10px' }}>
              {progressDescription}
              {isStepLoading && <LoadingDots />}
            </Text>
          )}
        </div>
      )}

      {selectedFile && (
        <div style={{ marginTop: '20px' }}>
          <Text strong>{t('upload.selectedFile')}: {selectedFile.name}</Text>
        </div>
      )}

      {!uploading && selectedFile && (
        <div style={{ marginTop: '20px' }}>
          <Tooltip title={t('upload.tooltipStart')}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleUpload}
            >
              {t('upload.startProcessing')}
            </Button>
          </Tooltip>
        </div>
      )}
    </Container>
  );
}

export default ZipFileUploader;
