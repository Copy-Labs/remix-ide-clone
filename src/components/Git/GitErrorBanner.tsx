import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function GitErrorBanner({ error }: { error: Error | string | null }) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  if (!errorMessage.includes('Invalid checksum in GitIndex buffer')) return null;

  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTitle>Corrupted Git Index Detected</AlertTitle>
      <AlertDescription>
        The Git index appears to be corrupted. We are attempting to resolve this issue automatically.
      </AlertDescription>
    </Alert>
  );
}
