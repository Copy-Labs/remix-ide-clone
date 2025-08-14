import React from 'react';
import { useDeploymentStore } from '@/stores/deploymentStore';
import { Separator } from '@/components/ui/separator';

const StatusBar: React.FC = () => {
  const {
    selectedNetwork,
    availableNetworks,
    gasPrice,
    ethPrice,
    account,
    balance,
  } = useDeploymentStore();

  // Find the current network details
  const currentNetwork = availableNetworks.find((network) => network.id === selectedNetwork);

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
            <div className="flex items-center space-x-1">
              <span className="text-xs">Balance:</span>
              <span className="font-medium text-foreground">
                {formatBalance(balance)}
              </span>
            </div>

            <Separator orientation="vertical" className="h-4" />

            <div className="flex items-center space-x-1">
              <span className="text-xs">Account:</span>
              <span className="font-mono text-xs font-medium text-foreground">
                {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </span>
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
