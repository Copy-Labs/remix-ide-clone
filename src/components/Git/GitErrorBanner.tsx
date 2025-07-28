import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export function GitErrorBanner({ error }: { error: Error | string | null }) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  // Check for Git index corruption
  if (errorMessage.includes('Invalid checksum in GitIndex buffer')) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Git Index Corruption Detected</AlertTitle>
        <AlertDescription>
          The Git index appears to be corrupted. The system is automatically attempting to recover by resetting the Git index. Please wait...
        </AlertDescription>
      </Alert>
    );
  }

  // Check for recovery success message
  if (errorMessage.includes('Git index reset successfully')) {
    return (
      <Alert variant="default" className="mt-4 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Git Index Recovered</AlertTitle>
        <AlertDescription className="text-green-700">
          The Git index corruption has been automatically resolved. You can now continue with your Git operations.
        </AlertDescription>
      </Alert>
    );
  }

  // Check for recovery failure
  if (errorMessage.includes('recovery failed')) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Git Index Recovery Failed</AlertTitle>
        <AlertDescription>
          Unable to automatically recover from Git index corruption. Please try reinitializing the repository or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
