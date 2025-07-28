import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Collapse,
  Tooltip,
  Badge,
  Typography,
  Space,
  Divider,
  Card,
  List,
  Tag,
} from 'antd';
import {
  InfoCircleOutlined,
  WarningOutlined,
  QuestionCircleOutlined,
  DesktopOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import {
  gitFallbackService,
  BrowserSupportLevel,
  GitOperationMetadata,
} from '@/services/gitFallbackService';

const { Panel } = Collapse;
const { Title, Text, Paragraph } = Typography;

const Container = styled.div`
  padding: 16px;
`;

const OperationTag = styled(Tag)<{ $supportLevel: BrowserSupportLevel }>`
  margin: 4px;
  background-color: ${(props) => {
    switch (props.$supportLevel) {
      case BrowserSupportLevel.FULL:
        return '#52c41a';
      case BrowserSupportLevel.LIMITED:
        return '#faad14';
      case BrowserSupportLevel.UNSUPPORTED:
        return '#ff4d4f';
      case BrowserSupportLevel.DESKTOP_ONLY:
        return '#1890ff';
      default:
        return '#d9d9d9';
    }
  }};
  color: white;
`;

const FeatureCard = styled(Card)`
  margin-bottom: 16px;
`;

/**
 * GitBrowserLimitations component
 *
 * This component displays information about Git operations that have limitations
 * in browser environments, along with contextual help messages and workarounds.
 */
const GitBrowserLimitations: React.FC = () => {
  const [fullySupportedOps, setFullySupportedOps] = useState<GitOperationMetadata[]>([]);
  const [limitedSupportOps, setLimitedSupportOps] = useState<GitOperationMetadata[]>([]);
  const [unsupportedOps, setUnsupportedOps] = useState<GitOperationMetadata[]>([]);
  const [desktopOnlyOps, setDesktopOnlyOps] = useState<GitOperationMetadata[]>([]);
  const [isBrowserEnvironment, setIsBrowserEnvironment] = useState<boolean>(true);

  // Detect environment and get operations by support level
  useEffect(() => {
    // Check if we're in a browser environment
    const isNodeJS =
      typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
    setIsBrowserEnvironment(!isNodeJS);

    // Get operations by support level
    setFullySupportedOps(gitFallbackService.getOperationsBySupportLevel(BrowserSupportLevel.FULL));
    setLimitedSupportOps(
      gitFallbackService.getOperationsBySupportLevel(BrowserSupportLevel.LIMITED),
    );
    setUnsupportedOps(
      gitFallbackService.getOperationsBySupportLevel(BrowserSupportLevel.UNSUPPORTED),
    );
    setDesktopOnlyOps(
      gitFallbackService.getOperationsBySupportLevel(BrowserSupportLevel.DESKTOP_ONLY),
    );
  }, []);

  // Render a badge with the appropriate color for the support level
  const renderSupportLevelBadge = (supportLevel: BrowserSupportLevel) => {
    switch (supportLevel) {
      case BrowserSupportLevel.FULL:
        return <Badge status="success" text="Fully Supported" />;
      case BrowserSupportLevel.LIMITED:
        return <Badge status="warning" text="Limited Support" />;
      case BrowserSupportLevel.UNSUPPORTED:
        return <Badge status="error" text="Not Supported" />;
      case BrowserSupportLevel.DESKTOP_ONLY:
        return <Badge status="processing" text="Desktop Only" />;
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  // Render a list of operations with their support level
  const renderOperationsList = (operations: GitOperationMetadata[]) => (
    <List
      itemLayout="horizontal"
      dataSource={operations}
      renderItem={(operation) => (
        <List.Item
          actions={[
            operation.desktopHandoffUrl && (
              <Tooltip title="View documentation">
                <Button
                  type="link"
                  icon={<InfoCircleOutlined />}
                  onClick={() => window.open(operation.desktopHandoffUrl, '_blank')}
                >
                  Docs
                </Button>
              </Tooltip>
            ),
            operation.alternativeOperation && (
              <Tooltip title={`Alternative: ${operation.alternativeOperation}`}>
                <Button type="link" icon={<QuestionCircleOutlined />}>
                  Alternative
                </Button>
              </Tooltip>
            ),
          ].filter(Boolean)}
        >
          <List.Item.Meta
            title={operation.name}
            description={
              <div>
                <Paragraph>{operation.description}</Paragraph>
                <Paragraph type="secondary">{operation.userGuidance}</Paragraph>
              </div>
            }
          />
        </List.Item>
      )}
    />
  );

  return (
    <Container>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={2}>
          Git in Browser Environment
          {isBrowserEnvironment ? (
            <CloudOutlined style={{ marginLeft: 8 }} />
          ) : (
            <DesktopOutlined style={{ marginLeft: 8 }} />
          )}
        </Title>

        <Alert
          message="Browser Environment Detected"
          description={
            <div>
              <Paragraph>
                You are currently using Git in a browser environment, which has some limitations
                compared to desktop Git clients. This page explains what works, what doesn't, and
                provides workarounds for common tasks.
              </Paragraph>
              <Paragraph>
                <strong>Why are there limitations?</strong> Browsers run in a security sandbox that
                restricts access to the file system, network requests, and process execution - all
                things that traditional Git relies on.
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
        />

        <Divider orientation="left">Support Status</Divider>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {fullySupportedOps.map((op) => (
            <OperationTag key={op.name} $supportLevel={BrowserSupportLevel.FULL}>
              {op.name}
            </OperationTag>
          ))}
          {limitedSupportOps.map((op) => (
            <OperationTag key={op.name} $supportLevel={BrowserSupportLevel.LIMITED}>
              {op.name}
            </OperationTag>
          ))}
          {unsupportedOps.map((op) => (
            <OperationTag key={op.name} $supportLevel={BrowserSupportLevel.UNSUPPORTED}>
              {op.name}
            </OperationTag>
          ))}
          {desktopOnlyOps.map((op) => (
            <OperationTag key={op.name} $supportLevel={BrowserSupportLevel.DESKTOP_ONLY}>
              {op.name}
            </OperationTag>
          ))}
        </div>

        <Collapse defaultActiveKey={['limited']}>
          {fullySupportedOps.length > 0 && (
            <Panel
              header={
                <Space>
                  <Badge status="success" />
                  <span>Fully Supported Operations</span>
                </Space>
              }
              key="full"
            >
              {renderOperationsList(fullySupportedOps)}
            </Panel>
          )}

          {limitedSupportOps.length > 0 && (
            <Panel
              header={
                <Space>
                  <Badge status="warning" />
                  <span>Limited Support Operations</span>
                </Space>
              }
              key="limited"
            >
              <Alert
                message="Limited Browser Support"
                description="These operations have limited support in browser environments. They may work in some cases but have restrictions or may fail in certain scenarios."
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              {renderOperationsList(limitedSupportOps)}
            </Panel>
          )}

          {unsupportedOps.length > 0 && (
            <Panel
              header={
                <Space>
                  <Badge status="error" />
                  <span>Unsupported Operations</span>
                </Space>
              }
              key="unsupported"
            >
              <Alert
                message="Not Supported in Browser"
                description="These operations are not supported in browser environments due to technical limitations. Use a desktop Git client for these operations."
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
              {renderOperationsList(unsupportedOps)}
            </Panel>
          )}

          {desktopOnlyOps.length > 0 && (
            <Panel
              header={
                <Space>
                  <Badge status="processing" />
                  <span>Desktop-Only Operations</span>
                </Space>
              }
              key="desktop"
            >
              <Alert
                message="Desktop Environment Required"
                description="These operations require a desktop environment and cannot be performed in a browser. They typically need direct file system access or process execution capabilities."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              {renderOperationsList(desktopOnlyOps)}
            </Panel>
          )}
        </Collapse>

        <Divider orientation="left">Common Workarounds</Divider>

        <FeatureCard title="Cloning Private Repositories">
          <Paragraph>
            <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Browser environments have limited support for cloning private repositories due to
            authentication challenges.
          </Paragraph>
          <Paragraph>
            <strong>Workaround:</strong> Download the repository as a ZIP file from GitHub/GitLab
            and import it, or use the desktop application.
          </Paragraph>
        </FeatureCard>

        <FeatureCard title="Pushing to Remote Repositories">
          <Paragraph>
            <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Pushing directly to remote repositories may be limited by CORS policies and
            authentication challenges.
          </Paragraph>
          <Paragraph>
            <strong>Workaround:</strong> Export your project and push using a desktop Git client, or
            use the GitHub/GitLab web interface to upload files.
          </Paragraph>
        </FeatureCard>

        <FeatureCard title="Large Repositories">
          <Paragraph>
            <WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />
            Browser storage is limited, which can cause issues with large repositories.
          </Paragraph>
          <Paragraph>
            <strong>Workaround:</strong> Use Git LFS for large files, or work with smaller
            repositories in the browser.
          </Paragraph>
        </FeatureCard>

        <Divider orientation="left">Resources</Divider>

        <Space direction="vertical">
          <Paragraph>
            <a href="https://isomorphic-git.org/" target="_blank" rel="noopener noreferrer">
              Isomorphic Git Documentation
            </a>{' '}
            - The Git implementation used in the browser environment
          </Paragraph>
          <Paragraph>
            <a href="https://git-scm.com/book/en/v2" target="_blank" rel="noopener noreferrer">
              Pro Git Book
            </a>{' '}
            - Comprehensive guide to Git
          </Paragraph>
          <Paragraph>
            <a
              href="https://docs.github.com/en/github/using-git"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Git Documentation
            </a>{' '}
            - GitHub's guide to using Git
          </Paragraph>
        </Space>
      </Space>
    </Container>
  );
};

export default GitBrowserLimitations;
