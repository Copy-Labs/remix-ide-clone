import React, { useState } from 'react';
import { web3Service } from '@/services/web3Service';
import { walletConnectService } from '@/services/walletConnectService';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { toast } from 'sonner';
import {
  Wallet,
  Smartphone,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap
} from 'lucide-react';

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (provider: 'metamask' | 'walletconnect') => void;
  recommendedProvider?: 'metamask' | 'walletconnect';
}

interface WalletOption {
  id: 'metamask' | 'walletconnect';
  name: string;
  icon: string;
  description: string;
  features: string[];
  isAvailable: boolean;
  isRecommended: boolean;
  installUrl?: string;
  downloadUrl?: string;
}

/**
 * Wallet selector component that allows users to choose between wallet providers
 * Features:
 * - Display available wallet providers
 * - Show connection status
 * - Provide installation links
 * - Recommend best option based on device
 * - Handle connection process
 */
export const WalletSelector: React.FC<WalletSelectorProps> = ({
  isOpen,
  onClose,
  onConnect,
  recommendedProvider,
}) => {
  const [connecting, setConnecting] = useState<{ [key: string]: boolean }>({});
  const [connectionStatus, setConnectionStatus] = useState<{ [key: string]: 'idle' | 'connecting' | 'success' | 'error' }>({});

  // Get available wallet providers with detailed information
  const getWalletOptions = (): WalletOption[] => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    return [
      {
        id: 'metamask',
        name: 'MetaMask',
        icon: '🦊',
        description: 'The most popular browser wallet for Ethereum and EVM networks.',
        features: [
          'Browser extension',
          'Hardware wallet support',
          'Token swapping',
          'NFT support',
          'Popular among developers'
        ],
        isAvailable: web3Service.isMetaMaskAvailable(),
        isRecommended: recommendedProvider === 'metamask' || (web3Service.isMetaMaskAvailable() && !isMobile),
        installUrl: 'https://metamask.io/download/',
      },
      {
        id: 'walletconnect',
        name: 'WalletConnect',
        icon: '🔗',
        description: 'Connect to 300+ wallets including mobile and desktop wallets.',
        features: [
          '300+ supported wallets',
          'Mobile wallet support',
          'Cross-platform compatibility',
          'QR code connection',
          'Best for mobile users'
        ],
        isAvailable: true,
        isRecommended: recommendedProvider === 'walletconnect' || isMobile,
        downloadUrl: 'https://walletconnect.com/explorer',
      },
    ];
  };

  const walletOptions = getWalletOptions();

  // Handle wallet connection
  const handleConnect = async (provider: 'metamask' | 'walletconnect') => {
    setConnecting(prev => ({ ...prev, [provider]: true }));
    setConnectionStatus(prev => ({ ...prev, [provider]: 'connecting' }));

    try {
      const success = await web3Service.connect(provider);

      if (success) {
        setConnectionStatus(prev => ({ ...prev, [provider]: 'success' }));
        toast.success(`Connected to ${provider === 'metamask' ? 'MetaMask' : 'WalletConnect'} successfully!`);
        onConnect(provider);
        onClose();
      } else {
        setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
        toast.error(`Failed to connect to ${provider === 'metamask' ? 'MetaMask' : 'WalletConnect'}`);
      }
    } catch (error) {
      console.error(`Failed to connect to ${provider}:`, error);
      setConnectionStatus(prev => ({ ...prev, [provider]: 'error' }));
      toast.error(`Failed to connect to ${provider === 'metamask' ? 'MetaMask' : 'WalletConnect'}`);
    } finally {
      setConnecting(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Get status icon and color
  const getStatusInfo = (provider: 'metamask' | 'walletconnect') => {
    const status = connectionStatus[provider] || 'idle';

    switch (status) {
      case 'connecting':
        return {
          icon: <Loader2 size={16} className="animate-spin" />,
          color: 'text-blue-500',
          text: 'Connecting...'
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={16} className="text-green-500" />,
          color: 'text-green-500',
          text: 'Connected'
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} className="text-red-500" />,
          color: 'text-red-500',
          text: 'Failed'
        };
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet size={20} />
            Connect Wallet
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose your preferred wallet provider to connect to the blockchain
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Wallet Options */}
          <div className="space-y-3">
            {walletOptions.map((option) => {
              const statusInfo = getStatusInfo(option.id);
              const isConnecting = connecting[option.id] || false;

              return (
                <div
                  key={option.id}
                  className={`
                    p-4 border rounded-lg transition-all hover:shadow-sm
                    ${option.isRecommended 
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20' 
                      : 'border-border bg-background'
                    }
                  `}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{option.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{option.name}</h3>
                          {option.isRecommended && (
                            <Badge variant="secondary" className="text-xs">
                              <Zap size={10} className="mr-1" />
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    {statusInfo && (
                      <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                        {statusInfo.icon}
                        <span className="text-xs">{statusInfo.text}</span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {option.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {option.features.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{option.features.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!option.isAvailable && option.installUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="flex-1"
                      >
                        <a
                          href={option.installUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink size={14} />
                          Install {option.name}
                        </a>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleConnect(option.id)}
                      disabled={isConnecting || !option.isAvailable}
                      className="flex-1"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 size={14} className="mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Smartphone size={14} className="mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Availability Status */}
                  {!option.isAvailable && option.installUrl && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                      <div className="flex items-center gap-2 text-xs text-yellow-800 dark:text-yellow-200">
                        <AlertCircle size={12} />
                        {option.name} is not installed. Click "Install {option.name}" to get started.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Additional Information */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Globe size={12} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium mb-1">What is WalletConnect?</p>
                <p>
                  WalletConnect connects you to 300+ mobile and desktop wallets. Perfect for mobile
                  users or if you prefer using your mobile wallet for transactions.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>

            <div className="flex gap-2">
              {walletOptions.find(w => !w.isAvailable)?.installUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a
                    href="https://walletconnect.com/explorer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink size={12} />
                    View All Wallets
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletSelector;
