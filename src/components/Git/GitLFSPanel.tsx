import React, { useState, useEffect } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { gitLFSService } from '@/services/gitLFSService';
import { Button, Table, Tooltip, Progress, Input, Select, message } from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';

const { Option } = Select;

const Container = styled.div`
  padding: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h2`
  margin: 0;
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: #666;
`;

const StatValue = styled.span`
  font-size: 16px;
  font-weight: bold;
`;

const SettingsContainer = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingLabel = styled.span`
  width: 150px;
  margin-right: 8px;
`;

/**
 * GitLFSPanel component for managing Git LFS files
 */
const GitLFSPanel: React.FC = () => {
  // State for LFS files
  const [lfsFiles, setLFSFiles] = useState<
    Array<{
      oid: string;
      filepath: string;
      size: number;
      date: string;
    }>
  >([]);

  // State for LFS settings
  const [sizeThreshold, setSizeThreshold] = useState<number>(5 * 1024 * 1024); // 5MB default
  const [lfsExtensions, setLFSExtensions] = useState<string[]>([]);
  const [newExtension, setNewExtension] = useState<string>('');

  // State for storage stats
  const [totalSize, setTotalSize] = useState<number>(0);
  const [usedStorage, setUsedStorage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Get Git store
  const { isInitialized } = useGitStore();

  // Load LFS files and stats
  const loadLFSFiles = async () => {
    if (!isInitialized) return;

    setLoading(true);
    try {
      // This is a placeholder - in a real implementation, we would get this data from gitLFSService
      // const files = await gitLFSService.listLFSFiles();
      // setLFSFiles(files);

      // For now, use mock data
      setLFSFiles([
        {
          oid: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          filepath: 'images/large-image.png',
          size: 7340032, // ~7MB
          date: new Date().toISOString(),
        },
        {
          oid: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          filepath: 'videos/demo.mp4',
          size: 15728640, // ~15MB
          date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
      ]);

      // Get total LFS size
      // const total = await gitLFSService.getTotalLFSSize();
      // setTotalSize(total);

      // Mock total size
      setTotalSize(23068672); // ~22MB

      // Mock used storage (percentage of browser storage)
      setUsedStorage(30); // 30%

      // Get LFS settings
      // const settings = await gitLFSService.getSettings();
      // setSizeThreshold(settings.sizeThreshold);
      // setLFSExtensions(settings.lfsExtensions);

      // Mock LFS extensions
      setLFSExtensions(['.png', '.jpg', '.mp4', '.zip']);
    } catch (err) {
      console.error('Failed to load LFS files:', err);
      message.error('Failed to load LFS files');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadLFSFiles();
  }, [isInitialized]);

  // Format bytes to human-readable size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle adding a new extension
  const handleAddExtension = () => {
    if (!newExtension) return;

    // Ensure extension starts with a dot
    let ext = newExtension;
    if (!ext.startsWith('.')) {
      ext = '.' + ext;
    }

    // Check if extension already exists
    if (lfsExtensions.includes(ext)) {
      message.warning(`Extension ${ext} is already in the list`);
      return;
    }

    // Add extension
    setLFSExtensions([...lfsExtensions, ext]);
    setNewExtension('');

    // In a real implementation, we would save the settings
    // await gitLFSService.saveSettings({ sizeThreshold, lfsExtensions: [...lfsExtensions, ext] });

    message.success(`Added ${ext} to LFS extensions`);
  };

  // Handle removing an extension
  const handleRemoveExtension = (ext: string) => {
    setLFSExtensions(lfsExtensions.filter((e) => e !== ext));

    // In a real implementation, we would save the settings
    // await gitLFSService.saveSettings({ sizeThreshold, lfsExtensions: lfsExtensions.filter(e => e !== ext) });

    message.success(`Removed ${ext} from LFS extensions`);
  };

  // Handle changing size threshold
  const handleSizeThresholdChange = (value: number) => {
    setSizeThreshold(value * 1024 * 1024); // Convert MB to bytes

    // In a real implementation, we would save the settings
    // await gitLFSService.saveSettings({ sizeThreshold: value * 1024 * 1024, lfsExtensions });

    message.success(`Set LFS size threshold to ${value}MB`);
  };

  // Table columns
  const columns = [
    {
      title: 'File',
      dataIndex: 'filepath',
      key: 'filepath',
      render: (text: string) => {
        const filename = text.split('/').pop() || text;
        return <Tooltip title={text}>{filename}</Tooltip>;
      },
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatBytes(size),
      sorter: (a: any, b: any) => a.size - b.size,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text: string, record: any) => (
        <div>
          <Tooltip title="Download">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              style={{ marginRight: 8 }}
              onClick={() => {
                // In a real implementation, we would download the file
                // await gitLFSService.downloadLFSFile(record.oid);
                message.success(`Downloaded ${record.filepath}`);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => {
                // In a real implementation, we would delete the file
                // await gitLFSService.deleteLFSFile(record.oid);
                setLFSFiles(lfsFiles.filter((f) => f.oid !== record.oid));
                message.success(`Deleted ${record.filepath}`);
              }}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <Container>
      <Header>
        <Title>Git LFS Manager</Title>
        <Button type="primary" onClick={loadLFSFiles} loading={loading}>
          Refresh
        </Button>
      </Header>

      <StatsContainer>
        <StatItem>
          <StatLabel>Total LFS Files</StatLabel>
          <StatValue>{lfsFiles.length}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Total Size</StatLabel>
          <StatValue>{formatBytes(totalSize)}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Storage Usage</StatLabel>
          <div>
            <Progress percent={usedStorage} size="small" />
          </div>
        </StatItem>
      </StatsContainer>

      <SettingsContainer>
        <Header>
          <Title style={{ fontSize: '16px' }}>LFS Settings</Title>
          <Tooltip title="These settings control which files are stored in LFS">
            <InfoCircleOutlined />
          </Tooltip>
        </Header>

        <SettingRow>
          <SettingLabel>Size Threshold:</SettingLabel>
          <Select
            value={sizeThreshold / (1024 * 1024)}
            onChange={handleSizeThresholdChange}
            style={{ width: 120 }}
          >
            <Option value={1}>1 MB</Option>
            <Option value={5}>5 MB</Option>
            <Option value={10}>10 MB</Option>
            <Option value={50}>50 MB</Option>
            <Option value={100}>100 MB</Option>
          </Select>
          <span style={{ marginLeft: 8 }}>Files larger than this will use LFS</span>
        </SettingRow>

        <SettingRow>
          <SettingLabel>LFS Extensions:</SettingLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {lfsExtensions.map((ext) => (
              <Button key={ext} size="small" onClick={() => handleRemoveExtension(ext)}>
                {ext} <DeleteOutlined />
              </Button>
            ))}
          </div>
        </SettingRow>

        <SettingRow>
          <SettingLabel>Add Extension:</SettingLabel>
          <Input
            value={newExtension}
            onChange={(e) => setNewExtension(e.target.value)}
            placeholder=".png"
            style={{ width: 120 }}
            onPressEnter={handleAddExtension}
          />
          <Button
            type="primary"
            onClick={handleAddExtension}
            style={{ marginLeft: 8 }}
            disabled={!newExtension}
          >
            Add
          </Button>
        </SettingRow>
      </SettingsContainer>

      <Table
        columns={columns}
        dataSource={lfsFiles}
        rowKey="oid"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Container>
  );
};

export default GitLFSPanel;
