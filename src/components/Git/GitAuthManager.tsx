import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface GitAuthManagerProps {
  onAuthSuccess?: () => void;
}

const GitAuthManager: React.FC<GitAuthManagerProps> = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Git Functionality Unavailable</CardTitle>
        <CardDescription>
          Git functionality is not available in browser environments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-center text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Browser Environment Limitation</p>
              <p className="text-sm">
                Git functionality is not supported in browser environments. Remote operations like clone, push, pull, and fetch cannot be performed. GitHub and GitLab integrations are not available.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GitAuthManager;
