import React, { useState, useEffect } from 'react';
import {
  browserGitLimitationsService,
  BrowserGitLimitationType,
} from '@/services/browserGitLimitations';
import { Tooltip, Badge, Box, Text, Link, Icon } from '@chakra-ui/react';
import { InfoIcon, WarningIcon, WarningTwoIcon } from '@chakra-ui/icons';

interface GitLimitationIndicatorProps {
  operation?: string;
  limitationType?: BrowserGitLimitationType;
  showDocLink?: boolean;
}

/**
 * Component that displays visual indicators and help messages for Git limitations in browser environments
 */
export const GitLimitationIndicator: React.FC<GitLimitationIndicatorProps> = ({
  operation,
  limitationType,
  showDocLink = true,
}) => {
  const [message, setMessage] = useState<string | null>(null);
  const [limitation, setLimitation] = useState<any>(null);
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    // Check if running in browser environment
    setIsBrowser(browserGitLimitationsService.isBrowserEnvironment());

    // Get message based on operation or limitation type
    if (operation) {
      setMessage(browserGitLimitationsService.getContextualHelpMessage(operation));
    } else if (limitationType) {
      const limitationInfo = browserGitLimitationsService.getLimitation(limitationType);
      if (limitationInfo) {
        setLimitation(limitationInfo);
        setMessage(`${limitationInfo.title}: ${limitationInfo.description}`);
      }
    }
  }, [operation, limitationType]);

  // Don't render anything if not in browser or no limitations apply
  if (!isBrowser || (!message && !limitation)) {
    return null;
  }

  // Determine icon and color based on impact
  const getIconAndColor = () => {
    if (limitation) {
      switch (limitation.impact) {
        case 'high':
          return { icon: <WarningTwoIcon />, color: 'red.500' };
        case 'medium':
          return { icon: <WarningIcon />, color: 'orange.500' };
        case 'low':
          return { icon: <InfoIcon />, color: 'blue.500' };
        default:
          return { icon: <InfoIcon />, color: 'blue.500' };
      }
    }
    return { icon: <InfoIcon />, color: 'blue.500' };
  };

  const { icon, color } = getIconAndColor();

  return (
    <Box display="inline-flex" alignItems="center" my={1}>
      <Tooltip
        hasArrow
        placement="top"
        label={
          <Box p={2} maxW="400px">
            <Text fontWeight="bold">{limitation?.title || 'Browser Limitation'}</Text>
            <Text mt={1}>{message}</Text>
            {limitation?.workaround && (
              <Text mt={2} fontStyle="italic">
                <Text as="span" fontWeight="bold">
                  Workaround:
                </Text>{' '}
                {limitation.workaround}
              </Text>
            )}
            {showDocLink && limitation?.documentationUrl && (
              <Link
                href={limitation.documentationUrl}
                isExternal
                color="blue.300"
                mt={2}
                display="block"
              >
                Learn more
              </Link>
            )}
          </Box>
        }
      >
        <Badge
          colorScheme={color.split('.')[0]}
          variant="subtle"
          display="flex"
          alignItems="center"
          px={2}
          py={1}
          borderRadius="md"
        >
          <Box as="span" mr={1} color={color}>
            {icon}
          </Box>
          <Text fontSize="xs">Browser Limitation</Text>
        </Badge>
      </Tooltip>
    </Box>
  );
};

/**
 * Component that displays a feature detection indicator for Git operations
 */
export const GitFeatureDetection: React.FC<{ operation: string }> = ({ operation }) => {
  const isSupported = browserGitLimitationsService.isOperationSupported(operation);
  const isBrowser = browserGitLimitationsService.isBrowserEnvironment();

  // Don't render anything if not in browser or operation is supported
  if (!isBrowser || isSupported) {
    return null;
  }

  return (
    <Tooltip
      hasArrow
      placement="top"
      label={
        <Box p={2}>
          <Text fontWeight="bold">Operation Not Supported</Text>
          <Text mt={1}>
            The operation '{operation}' is not fully supported in browser environments.
          </Text>
          <Text mt={2} fontStyle="italic">
            <Text as="span" fontWeight="bold">
              Alternative:
            </Text>{' '}
            Use the desktop application for this feature.
          </Text>
        </Box>
      }
    >
      <Badge colorScheme="red" variant="solid" ml={2}>
        Not Supported
      </Badge>
    </Tooltip>
  );
};
