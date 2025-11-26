import React from 'react';
import { useDeploymentStore } from '@/stores/deploymentStore';
import { Separator } from '@/components/ui/separator';
import { Copy, Zap } from 'lucide-react';
import { toast } from 'sonner';

const StatusBar: React.FC = () => {
  const {
    selectedNetwork,
    availableNetworks,
    gasPrice,
    ethPrice,
    account,
    balance,
    currentProvider,
    vmAccount,
  } = useDeploymentStore();

  // Find the current network details
  const currentNetwork = availableNetworks.find((network) => network.id === selectedNetwork);

  // Get VM account name from the store
  const vmAccountName = vmAccount?.name || null;

  // Format gas price for display
  const formatGasPrice = (price: string | null) => {
    if (!price) return 'N/A';
    return `${parseFloat(price).toFixed(2)} Gwei`;
  };

  // Format ETH price for display
  const formatEthPrice = (price: number | null) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format balance for display
  const formatBalance = (bal: string | null) => {
    if (!bal) return 'N/A';
    const balanceNum = parseFloat(bal);
    return `${balanceNum.toFixed(4)} ETH`;
  };

  return (
    <div className="fixed bottom-0 z-50 w-full h-10 flex items-center justify-between bg-card border-t border-border px-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center space-x-4">
        {/* Network Information */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${currentNetwork?.isTestnet ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="font-medium">
              {currentNetwork?.name || 'No Network'}
            </span>
          </div>
          {currentNetwork && (
            <span className="text-xs opacity-75">
              ({currentNetwork.symbol})
            </span>
          )}
        </div>

        <Separator orientation="vertical" className="h-4" />

        {/* Price Information */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span className="text-xs">ETH:</span>
            <span className="font-medium text-foreground">
              {formatEthPrice(ethPrice)}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-xs">Gas:</span>
            <span className="font-medium text-foreground">
              {formatGasPrice(gasPrice)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Account Information */}
        {account && (
          <>
            {/* VM Account Name - Show for JavaScript VM */}
            {currentProvider === 'javascriptvm' && vmAccountName && (
              <>
                <div className="flex items-center space-x-1">
                  <Zap size={12} className="text-yellow-500" />
                  <span className="text-xs font-medium text-foreground">
                    {vmAccountName}
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
              </>
            )}

            <div className="flex items-center space-x-1">
              <span className="text-xs">Balance:</span>
              <span className="font-medium text-foreground">
                {currentProvider === 'javascriptvm' ? vmAccount && formatBalance(vmAccount?.balance) : formatBalance(balance)}
              </span>
            </div>

            <Separator orientation="vertical" className="h-4" />

            <div className="flex items-center space-x-1">
              <span className="text-xs">Account:</span>
              <span
                className="font-mono text-xs font-medium text-foreground cursor-pointer"
                title="Click to copy address"
                onClick={() => {
                  void navigator.clipboard.writeText(account)
                    .then(() => {
                      toast.success('Address copied to clipboard');
                    })
                    .catch(() => {
                      toast.error('Failed to copy address');
                    });
                }}
              >
                {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </span>
              <button
                type="button"
                aria-label="Copy address"
                title="Copy address"
                className="p-0.5 hover:text-foreground/90"
                onClick={(e) => {
                  e.stopPropagation();
                  void navigator.clipboard.writeText(account)
                    .then(() => {
                      toast.success('Address copied to clipboard');
                    })
                    .catch(() => {
                      toast.error('Failed to copy address');
                    });
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {!account && (
          <span className="text-xs opacity-75">
            No wallet connected
          </span>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
