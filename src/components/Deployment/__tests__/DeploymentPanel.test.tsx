import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import DeploymentPanel from '../DeploymentPanel';
import { useDeploymentStore } from '@/stores/deploymentStore';
import { useCompilerStore } from '@/stores/compilerStore';
import { toast } from 'sonner';

// Mock the stores
vi.mock('@/stores/deploymentStore');
vi.mock('@/stores/compilerStore');
vi.mock('sonner');

// Mock data
const mockCompiledContract = {
  name: 'TestContract',
  abi: [
    {
      type: 'constructor',
      inputs: [{ name: 'initialValue', type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'getValue',
      inputs: [],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'setValue',
      inputs: [{ name: 'newValue', type: 'uint256' }],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ],
  bytecode: '0x608060405234801561001057600080fd5b50...',
};

const mockDeployedContract = {
  address: '0x1234567890123456789012345678901234567890',
  name: 'TestContract',
  abi: mockCompiledContract.abi,
  deployedAt: Date.now(),
  networkId: 'ethereum-mainnet',
};

const mockNetwork = {
  id: 'ethereum-mainnet',
  name: 'Ethereum Mainnet',
  chainId: 1,
  rpcUrl: 'https://mainnet.infura.io/v3/...',
  symbol: 'ETH',
  isTestnet: false,
};

describe('DeploymentPanel', () => {
  const mockDeploymentStore = {
    account: null,
    balance: null,
    gasPrice: '20',
    gasLimit: '3000000',
    isDeploying: false,
    selectedNetwork: 'ethereum-mainnet',
    availableNetworks: [mockNetwork],
    deployedContracts: new Map([
      ['0x1234567890123456789012345678901234567890', mockDeployedContract],
    ]),
    connectWallet: vi.fn(),
    disconnectWallet: vi.fn(),
    switchNetwork: vi.fn(),
    deployContract: vi.fn(),
    callContractMethod: vi.fn(),
    getDeployedContractsByNetwork: vi.fn(() => [mockDeployedContract]),
  };

  const mockCompilerStore = {
    compilationResult: { success: true },
    selectedContract: 'TestContract',
    getSelectedContract: vi.fn(() => mockCompiledContract),
  };

  beforeEach(() => {
    vi.mocked(useDeploymentStore).mockReturnValue(mockDeploymentStore);
    vi.mocked(useCompilerStore).mockReturnValue(mockCompilerStore);
    vi.mocked(toast.error).mockImplementation(() => 'toast-id');
    vi.mocked(toast.success).mockImplementation(() => 'toast-id');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders deployment panel with correct title', () => {
    render(<DeploymentPanel />);
    expect(screen.getByRole('button', { name: /wallet connection/i })).toBeInTheDocument();
  });

  it('shows connect wallet button when not connected', () => {
    render(<DeploymentPanel />);
    expect(screen.getAllByText('Connect Wallet')[0]).toBeInTheDocument();
  });

  it('shows wallet info when connected', () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
      balance: '1.5',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    render(<DeploymentPanel />);
    expect(screen.getAllByText('Connected Account')[0]).toBeInTheDocument();
    expect(screen.getAllByText('0x1234567890123456789012345678901234567890')[0]).toBeInTheDocument();
    expect(screen.getByText(/Balance: 1.500000 ETH/)).toBeInTheDocument();
  });

  it('calls connectWallet when connect button is clicked', async () => {
    render(<DeploymentPanel />);

    const connectButton = screen.getAllByText('Connect Wallet')[0];
    fireEvent.click(connectButton);

    expect(mockDeploymentStore.connectWallet).toHaveBeenCalled();
  });

  it('shows contract deployment section when wallet is connected and contract is compiled', () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    render(<DeploymentPanel />);

    expect(screen.getByText('Contract Deployment')).toBeInTheDocument();
    expect(screen.getByText('TestContract')).toBeInTheDocument();
    expect(screen.getByText('Deploy Contract')).toBeInTheDocument();
  });

  it('shows constructor arguments input when contract has constructor', () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    render(<DeploymentPanel />);

    expect(screen.getByText('Constructor Arguments')).toBeInTheDocument();
    expect(screen.getByText('initialValue (uint256)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter uint256 value')).toBeInTheDocument();
  });

  it('calls deployContract when deploy button is clicked', async () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    render(<DeploymentPanel />);

    // Fill constructor argument
    const constructorInput = screen.getByPlaceholderText('Enter uint256 value');
    fireEvent.change(constructorInput, { target: { value: '100' } });

    // Click deploy button
    const deployButton = screen.getByText('Deploy Contract');
    fireEvent.click(deployButton);

    expect(mockDeploymentStore.deployContract).toHaveBeenCalledWith(mockCompiledContract, [100], {
      gas: 3000000,
    });
  });

  it('shows deployed contracts section when contracts exist', () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    render(<DeploymentPanel />);

    expect(screen.getByText('Deployed Contracts')).toBeInTheDocument();
    expect(screen.getByText('Select Contract')).toBeInTheDocument();
  });

  it('shows contract interaction interface when contract is selected', async () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    render(<DeploymentPanel />);

    // Select a deployed contract
    const contractSelect = screen.getByDisplayValue('Select a contract');
    fireEvent.change(contractSelect, {
      target: { value: '0x1234567890123456789012345678901234567890' },
    });

    await waitFor(() => {
      expect(screen.getByText('Select Method')).toBeInTheDocument();
    });
  });

  it('shows method arguments when method with parameters is selected', async () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    render(<DeploymentPanel />);

    // Select a deployed contract
    const contractSelect = screen.getByDisplayValue('Select a contract');
    fireEvent.change(contractSelect, {
      target: { value: '0x1234567890123456789012345678901234567890' },
    });

    // Wait for method select to appear and then select a method with parameters
    await waitFor(() => {
      const methodSelect = screen.getByDisplayValue('Select a method');
      fireEvent.change(methodSelect, { target: { value: 'setValue' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Method Arguments')).toBeInTheDocument();
      expect(screen.getByText('newValue (uint256)')).toBeInTheDocument();
    });
  });

  it('calls contract method when call button is clicked', async () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    render(<DeploymentPanel />);

    // Select a deployed contract
    const contractSelect = screen.getByDisplayValue('Select a contract');
    fireEvent.change(contractSelect, {
      target: { value: '0x1234567890123456789012345678901234567890' },
    });

    // Wait for method select to appear and then select a read method
    await waitFor(() => {
      const methodSelect = screen.getByDisplayValue('Select a method');
      fireEvent.change(methodSelect, { target: { value: 'getValue' } });
    });

    // Click call button
    await waitFor(() => {
      const callButton = screen.getByText('Call getValue');
      fireEvent.click(callButton);
    });

    expect(mockDeploymentStore.callContractMethod).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      'getValue',
      [],
      {},
    );
  });

  it('distinguishes between read and write methods', async () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    render(<DeploymentPanel />);

    // Select a deployed contract
    const contractSelect = screen.getByDisplayValue('Select a contract');
    fireEvent.change(contractSelect, {
      target: { value: '0x1234567890123456789012345678901234567890' },
    });

    // Check that methods are labeled correctly
    await waitFor(() => {
      const methodSelect = screen.getByDisplayValue('Select a method');
      fireEvent.click(methodSelect);

      expect(screen.getByText('getValue (read)')).toBeInTheDocument();
      expect(screen.getByText('setValue (write)')).toBeInTheDocument();
    });
  });

  it('handles deployment errors gracefully', async () => {
    const connectedStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
    };
    vi.mocked(useDeploymentStore).mockReturnValue(connectedStore);

    // Mock deployment failure
    mockDeploymentStore.deployContract.mockRejectedValue(new Error('Deployment failed'));

    render(<DeploymentPanel />);

    // Click deploy button
    const deployButton = screen.getByText('Deploy Contract');
    fireEvent.click(deployButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to deploy contract');
    });
  });

  it('shows loading state during deployment', () => {
    const deployingStore = {
      ...mockDeploymentStore,
      account: '0x1234567890123456789012345678901234567890',
      isDeploying: true,
    };
    vi.mocked(useDeploymentStore).mockReturnValue(deployingStore);

    render(<DeploymentPanel />);

    expect(screen.getByText('Deploying...')).toBeInTheDocument();
    expect(screen.getByText('Deploying...').closest('button')).toBeDisabled();
  });
});
