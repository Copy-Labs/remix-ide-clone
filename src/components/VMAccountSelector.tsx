import React, { useState, useEffect } from 'react';
import { javascriptVMService } from '@/services/javascriptVMService';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  Wallet,
  UserPlus,
  Copy,
  Check,
  Zap,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LocalVMAccount } from '@/types';

interface VMAccountSelectorProps {
  isVisible: boolean;
  onAccountChange?: (account: LocalVMAccount) => void;
}

/**
 * VM Account Selector Component
 * Allows users to switch between pre-funded VM accounts, create new accounts,
 * and manage account settings
 */
export const VMAccountSelector: React.FC<VMAccountSelectorProps> = ({
  isVisible,
  onAccountChange,
}) => {
  const [accounts, setAccounts] = useState<LocalVMAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<LocalVMAccount | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Load accounts when component becomes visible
  useEffect(() => {
    if (isVisible) {
      loadAccounts();
    }
  }, [isVisible]);

  // Listen for account changes from VM service
  useEffect(() => {
    const handleAccountChanged = (account: LocalVMAccount) => {
      setSelectedAccount(account);
      onAccountChange?.(account);
    };

    const handleAccountCreated = (account: LocalVMAccount) => {
      loadAccounts();
      setSelectedAccount(account);
      toast.success(`New account created: ${account.name}`);
    };

    javascriptVMService.on('accountChanged', handleAccountChanged);
    javascriptVMService.on('accountCreated', handleAccountCreated);

    return () => {
      javascriptVMService.off('accountChanged', handleAccountChanged);
      javascriptVMService.off('accountCreated', handleAccountCreated);
    };
  }, [onAccountChange]);

  /**
   * Load accounts from the JavaScript VM service
   */
  const loadAccounts = () => {
    try {
      const vmAccounts = javascriptVMService.getAccounts();
      setAccounts(vmAccounts);

      const currentAccount = javascriptVMService.getSelectedAccount();
      setSelectedAccount(currentAccount);
    } catch (err) {
      console.error('Failed to load VM accounts:', err);
      toast.error('Failed to load VM accounts');
    }
  };

  /**
   * Switch to a specific account
   */
  const selectAccount = async (account: LocalVMAccount) => {
    try {
      const accountIndex = accounts.findIndex((acc) => acc.id === account.id);
      if (accountIndex !== -1) {
        const success = javascriptVMService.selectAccount(accountIndex);
        if (success) {
          setSelectedAccount(account);
          onAccountChange?.(account);
          toast.success(`Switched to ${account.name}`);
        } else {
          toast.error('Failed to switch account');
        }
      }
    } catch (err) {
      console.error('Failed to select account:', err);
      toast.error('Failed to select account');
    }
  };

  /**
   * Create a new VM account
   */
  const createNewAccount = async () => {
    setIsCreatingAccount(true);
    try {
      const newAccount = javascriptVMService.createAccount();
      // loadAccounts() will be called via the accountCreated event listener
    } catch (err) {
      console.error('Failed to create account:', err);
      toast.error('Failed to create new account');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  /**
   * Copy account address to clipboard
   */
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
      toast.error('Failed to copy address');
    }
  };

  /**
   * Format address for display (shortened)
   */
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="w-full p-0 border-0">
      {/*<CardHeader className="">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap size={16} className="text-yellow-500" />
          JavaScript VM Account Manager
        </CardTitle>
      </CardHeader>*/}

      <CardContent className="space-y-4 p-0">
        {/* Current Account Display */}
        {selectedAccount && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                  <Wallet size={16} className="text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedAccount.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-muted-foreground">
                      {formatAddress(selectedAccount.address)}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyAddress(selectedAccount.address)}
                    >
                      {copiedAddress === selectedAccount.address ? (
                        <Check size={12} className="text-green-500" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{selectedAccount.balance} ETH</p>
                <Badge variant="secondary" className="text-xs">
                  Pre-funded
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Account Selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Switch Account</label>

          <Select
            value={selectedAccount?.id || ''}
            onValueChange={(accountId) => {
              const account = accounts.find((acc) => acc.id === accountId);
              if (account) {
                selectAccount(account);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{account.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatAddress(account.address)}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{account.balance} ETH</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Create New Account */}
          <Button
            onClick={createNewAccount}
            disabled={isCreatingAccount}
            className="w-full"
            variant="outline"
          >
            {isCreatingAccount ? (
              <>
                <Settings size={14} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus size={14} className="mr-2" />
                Create New Account
              </>
            )}
          </Button>
        </div>

        {/* Account List */}
        <div className="space-y-2">
          <label className="text-sm font-medium">All Accounts</label>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`
                  flex items-center justify-between p-2 rounded cursor-pointer transition-colors
                  ${selectedAccount?.id === account.id 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-muted'
                  }
                `}
                onClick={() => selectAccount(account)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{account.name}</span>
                  {selectedAccount?.id === account.id && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatAddress(account.address)}
                  </span>
                  <span className="text-sm font-medium">{account.balance} ETH</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VM Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">JavaScript VM Benefits:</p>
            <ul className="space-y-1 text-xs">
              <li>• No gas fees required</li>
              <li>• Instant contract deployment</li>
              <li>• Perfect for testing and development</li>
              <li>• Accounts persist across sessions</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VMAccountSelector;
