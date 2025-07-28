import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ChevronDown, Cloud, HelpCircle, Info, Monitor } from 'lucide-react';
import {
  BrowserSupportLevel,
  gitFallbackService,
  type GitOperationMetadata,
} from '@/services/gitFallbackService';

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

  // Get the appropriate styling for operation tags based on support level
  const getOperationTagStyle = (supportLevel: BrowserSupportLevel) => {
    switch (supportLevel) {
      case BrowserSupportLevel.FULL:
        return 'bg-green-500 text-white';
      case BrowserSupportLevel.LIMITED:
        return 'bg-yellow-500 text-white';
      case BrowserSupportLevel.UNSUPPORTED:
        return 'bg-red-500 text-white';
      case BrowserSupportLevel.DESKTOP_ONLY:
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  // Render a badge with the appropriate color for the support level
  const renderSupportLevelBadge = (supportLevel: BrowserSupportLevel) => {
    switch (supportLevel) {
      case BrowserSupportLevel.FULL:
        return (
          <Badge variant="default" className="bg-green-500">
            Fully Supported
          </Badge>
        );
      case BrowserSupportLevel.LIMITED:
        return (
          <Badge variant="default" className="bg-yellow-500">
            Limited Support
          </Badge>
        );
      case BrowserSupportLevel.UNSUPPORTED:
        return (
          <Badge variant="default" className="bg-red-500">
            Not Supported
          </Badge>
        );
      case BrowserSupportLevel.DESKTOP_ONLY:
        return (
          <Badge variant="default" className="bg-blue-500">
            Desktop Only
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  // Render a list of operations with their support level
  const renderOperationsList = (operations: GitOperationMetadata[]) => (
    <div className="space-y-4">
      {operations.map((operation) => (
        <div
          key={operation.name}
          className="flex justify-between items-start p-4 border rounded-lg"
        >
          <div className="flex-1">
            <h4 className="font-medium text-sm mb-2">{operation.name}</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">{operation.description}</p>
              <p className="text-sm text-gray-500">{operation.userGuidance}</p>
            </div>
          </div>
          <div className="flex space-x-2 ml-4">
            {operation.desktopHandoffUrl && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(operation.desktopHandoffUrl, '_blank')}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      Docs
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View documentation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {operation.alternativeOperation && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <HelpCircle className="h-4 w-4 mr-1" />
                      Alternative
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Alternative: {operation.alternativeOperation}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <h2 className="text-2xl font-semibold">Git in Browser Environment</h2>
        {isBrowserEnvironment ? <Cloud className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-3">
            <p>
              You are currently using Git in a browser environment, which has some limitations
              compared to desktop Git clients. This page explains what works, what doesn't, and
              provides workarounds for common tasks.
            </p>
            <p>
              <strong>Why are there limitations?</strong> Browsers run in a security sandbox that
              restricts access to the file system, network requests, and process execution - all
              things that traditional Git relies on.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <div>
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <span className="mr-2">Support Status</span>
        </h3>
        <Separator className="mb-4" />

        <div className="flex flex-wrap gap-2 mb-4">
          {fullySupportedOps.map((op) => (
            <Badge
              key={op.name}
              className={`m-1 ${getOperationTagStyle(BrowserSupportLevel.FULL)}`}
            >
              {op.name}
            </Badge>
          ))}
          {limitedSupportOps.map((op) => (
            <Badge
              key={op.name}
              className={`m-1 ${getOperationTagStyle(BrowserSupportLevel.LIMITED)}`}
            >
              {op.name}
            </Badge>
          ))}
          {unsupportedOps.map((op) => (
            <Badge
              key={op.name}
              className={`m-1 ${getOperationTagStyle(BrowserSupportLevel.UNSUPPORTED)}`}
            >
              {op.name}
            </Badge>
          ))}
          {desktopOnlyOps.map((op) => (
            <Badge
              key={op.name}
              className={`m-1 ${getOperationTagStyle(BrowserSupportLevel.DESKTOP_ONLY)}`}
            >
              {op.name}
            </Badge>
          ))}
        </div>

        <div className="space-y-4">
          {fullySupportedOps.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center space-x-2 w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <Badge variant="default" className="bg-green-500">
                  ●
                </Badge>
                <span className="font-medium">Fully Supported Operations</span>
                <ChevronDown className="h-4 w-4 ml-auto" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                {renderOperationsList(fullySupportedOps)}
              </CollapsibleContent>
            </Collapsible>
          )}

          {limitedSupportOps.length > 0 && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center space-x-2 w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <Badge variant="default" className="bg-yellow-500">
                  ●
                </Badge>
                <span className="font-medium">Limited Support Operations</span>
                <ChevronDown className="h-4 w-4 ml-auto" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    These operations have limited support in browser environments. They may work in
                    some cases but have restrictions or may fail in certain scenarios.
                  </AlertDescription>
                </Alert>
                {renderOperationsList(limitedSupportOps)}
              </CollapsibleContent>
            </Collapsible>
          )}

          {unsupportedOps.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center space-x-2 w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <Badge variant="default" className="bg-red-500">
                  ●
                </Badge>
                <span className="font-medium">Unsupported Operations</span>
                <ChevronDown className="h-4 w-4 ml-auto" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    These operations are not supported in browser environments due to technical
                    limitations. Use a desktop Git client for these operations.
                  </AlertDescription>
                </Alert>
                {renderOperationsList(unsupportedOps)}
              </CollapsibleContent>
            </Collapsible>
          )}

          {desktopOnlyOps.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center space-x-2 w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <Badge variant="default" className="bg-blue-500">
                  ●
                </Badge>
                <span className="font-medium">Desktop-Only Operations</span>
                <ChevronDown className="h-4 w-4 ml-auto" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    These operations require a desktop environment and cannot be performed in a
                    browser. They typically need direct file system access or process execution
                    capabilities.
                  </AlertDescription>
                </Alert>
                {renderOperationsList(desktopOnlyOps)}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Common Workarounds</h3>
        <Separator className="mb-4" />

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Cloning Private Repositories</h4>
            <div className="space-y-2">
              <p className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                Browser environments have limited support for cloning private repositories due to
                authentication challenges.
              </p>
              <p>
                <strong>Workaround:</strong> Download the repository as a ZIP file from
                GitHub/GitLab and import it, or use the desktop application.
              </p>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Pushing to Remote Repositories</h4>
            <div className="space-y-2">
              <p className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                Pushing directly to remote repositories may be limited by CORS policies and
                authentication challenges.
              </p>
              <p>
                <strong>Workaround:</strong> Export your project and push using a desktop Git
                client, or use the GitHub/GitLab web interface to upload files.
              </p>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-2">Large Repositories</h4>
            <div className="space-y-2">
              <p className="flex items-start">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                Browser storage is limited, which can cause issues with large repositories.
              </p>
              <p>
                <strong>Workaround:</strong> Use Git LFS for large files, or work with smaller
                repositories in the browser.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Resources</h3>
        <Separator className="mb-4" />

        <div className="space-y-2">
          <p>
            <a
              href="https://isomorphic-git.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Isomorphic Git Documentation
            </a>{' '}
            - The Git implementation used in the browser environment
          </p>
          <p>
            <a
              href="https://git-scm.com/book/en/v2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Pro Git Book
            </a>{' '}
            - Comprehensive guide to Git
          </p>
          <p>
            <a
              href="https://docs.github.com/en/github/using-git"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              GitHub Git Documentation
            </a>{' '}
            - GitHub's guide to using Git
          </p>
        </div>
      </div>
    </div>
  );
};

export default GitBrowserLimitations;
