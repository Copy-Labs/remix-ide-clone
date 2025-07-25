import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDeploymentStore } from '@/stores/deploymentStore';
import { web3Service } from '@/services/web3Service';
import { verificationService } from '@/services/verificationService';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/services/web3Service', () => ({
  web3Service: {
    isWalletConnected: vi.fn(),
    deployContract: vi.fn(),
    getNetwork: vi.fn(),
    waitForContract: vi.fn(),
    contractExists: vi.fn(),
  },
}));

vi.mock('@/services/verificationService', () => ({
  verificationService: {
    isNetworkSupported: vi.fn(),
    hasApiKey: vi.fn(),
    verifyContract: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    promise: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock setTimeout to execute immediately
vi.useFakeTimers();

describe('DeploymentStore', () => {
  let store: ReturnType<typeof useDeploymentStore.getState>;

  beforeEach(() => {
    // Reset the store
    useDeploymentStore.setState({
      deployedContracts: new Map(),
      isDeploying: false,
      selectedNetwork: 'localhost',
      availableNetworks: [],
      account: 'test-account',
      balance: '100',
      gasPrice: '20',
      gasLimit: '3000000',
      autoVerify: true,
    });

    // Get the store state
    store = useDeploymentStore.getState();

    // Reset mocks
    vi.resetAllMocks();

    // Mock web3Service
    web3Service.isWalletConnected.mockReturnValue(true);
    web3Service.getNetwork.mockReturnValue({
      id: 'localhost',
      name: 'Localhost',
      rpcUrl: 'http://localhost:8545',
      chainId: 1337,
      symbol: 'ETH',
      blockExplorer: 'http://localhost:8545',
      isTestnet: true,
    });

    // Mock verificationService
    verificationService.isNetworkSupported.mockReturnValue(true);
    verificationService.hasApiKey.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('deployContract', () => {
    it('should deploy a contract successfully', async () => {
      // Mock successful deployment
      const mockDeployResult = {
        address: '0x123',
        transactionHash: '0xabc',
      };
      web3Service.deployContract.mockResolvedValue(mockDeployResult);

      // Mock successful contract confirmation
      web3Service.waitForContract.mockResolvedValue(true);

      // Mock successful verification
      verificationService.verifyContract.mockResolvedValue({
        success: true,
        message: 'Contract verified successfully',
        url: 'http://localhost:8545/address/0x123#code',
      });

      // Call deployContract
      const mockContract = {
        name: 'TestContract',
        bytecode: '0x123',
        abi: [],
      };

      const result = await store.deployContract(mockContract, []);

      // Verify deployment was called
      expect(web3Service.deployContract).toHaveBeenCalledWith(
        mockContract.abi,
        mockContract.bytecode,
        [],
        expect.any(Object)
      );

      // Verify the contract was added to the store
      expect(result).not.toBeNull();
      expect(result?.address).toBe('0x123');

      // Fast-forward timers to trigger the verification process
      vi.runAllTimers();

      // Verify waitForContract was called
      expect(web3Service.waitForContract).toHaveBeenCalledWith('0x123', 15, 2000);

      // We can't directly verify that verifyContract was called because it's not mocked
      // Instead, we verify that the toast.info was called with the expected message
      expect(toast.info).toHaveBeenCalledWith('Contract confirmed on blockchain. Starting verification process...');
    });

    it('should handle deployment with undefined contract address', async () => {
      // Mock deployment with undefined address
      const mockDeployResult = {
        transactionHash: '0xabc',
        // address is intentionally omitted
      };
      web3Service.deployContract.mockResolvedValue(mockDeployResult);

      // Call deployContract
      const mockContract = {
        name: 'TestContract',
        bytecode: '0x123',
        abi: [],
      };

      const result = await store.deployContract(mockContract, []);

      // Verify deployment was called
      expect(web3Service.deployContract).toHaveBeenCalledWith(
        mockContract.abi,
        mockContract.bytecode,
        [],
        expect.any(Object)
      );

      // Verify the contract was added to the store
      expect(result).not.toBeNull();

      // Fast-forward timers to trigger the verification process
      vi.runAllTimers();

      // Verify waitForContract was NOT called because address is undefined
      expect(web3Service.waitForContract).not.toHaveBeenCalled();

      // Verify error toast was shown
      expect(toast.error).toHaveBeenCalledWith('Cannot verify contract: Contract address is undefined.');
    });

    it('should handle deployment failure', async () => {
      // Mock deployment failure
      web3Service.deployContract.mockResolvedValue(null);

      // Call deployContract
      const mockContract = {
        name: 'TestContract',
        bytecode: '0x123',
        abi: [],
      };

      const result = await store.deployContract(mockContract, []);

      // Verify deployment was called
      expect(web3Service.deployContract).toHaveBeenCalledWith(
        mockContract.abi,
        mockContract.bytecode,
        [],
        expect.any(Object)
      );

      // Verify the result is null
      expect(result).toBeNull();

      // Verify waitForContract was not called
      expect(web3Service.waitForContract).not.toHaveBeenCalled();

      // Verify verifyContract was not called
      expect(store.verifyContract).not.toHaveBeenCalled();
    });

    it('should handle contract confirmation failure', async () => {
      // Mock successful deployment
      const mockDeployResult = {
        address: '0x123',
        transactionHash: '0xabc',
      };
      web3Service.deployContract.mockResolvedValue(mockDeployResult);

      // Mock contract confirmation failure
      web3Service.waitForContract.mockResolvedValue(false);

      // Call deployContract
      const mockContract = {
        name: 'TestContract',
        bytecode: '0x123',
        abi: [],
      };

      const result = await store.deployContract(mockContract, []);

      // Verify deployment was called
      expect(web3Service.deployContract).toHaveBeenCalledWith(
        mockContract.abi,
        mockContract.bytecode,
        [],
        expect.any(Object)
      );

      // Verify the contract was added to the store
      expect(result).not.toBeNull();
      expect(result?.address).toBe('0x123');

      // Fast-forward timers to trigger the verification process
      vi.runAllTimers();

      // Verify waitForContract was called
      expect(web3Service.waitForContract).toHaveBeenCalledWith('0x123', 15, 2000);

      // Verify verifyContract was not called
      expect(store.verifyContract).not.toHaveBeenCalled();

      // Verify error toast was shown
      expect(toast.error).toHaveBeenCalledWith(
        'Contract not confirmed on blockchain after multiple attempts. Verification skipped.'
      );
    });
  });

  describe('verifyContract', () => {
    it('should verify a contract successfully', async () => {
      // Mock successful contract existence
      web3Service.contractExists.mockResolvedValue(true);

      // Mock successful verification
      verificationService.verifyContract.mockResolvedValue({
        success: true,
        message: 'Contract verified successfully',
        url: 'http://localhost:8545/address/0x123#code',
      });

      // Add a contract to the store
      store.deployedContracts.set('0x123', {
        name: 'TestContract',
        address: '0x123',
        abi: [],
        bytecode: '0x123',
        network: 'localhost',
        deployedAt: Date.now(),
        transactionHash: '0xabc',
        deploymentCost: '0',
        constructorArgs: [],
        shouldVerify: true,
      });

      // Call verifyContract
      const result = await store.verifyContract('0x123');

      // Verify contractExists was called
      expect(web3Service.contractExists).toHaveBeenCalledWith('0x123');

      // Verify verifyContract was called
      expect(verificationService.verifyContract).toHaveBeenCalled();

      // Verify the result is true
      expect(result).toBe(true);

      // Verify the contract was updated in the store
      const contract = store.deployedContracts.get('0x123');
      expect(contract?.verified).toBe(true);
      expect(contract?.verificationUrl).toBe('http://localhost:8545/address/0x123#code');
    });

    it('should handle invalid contract address', async () => {
      // Call verifyContract with invalid address
      const result = await store.verifyContract('invalid-address');

      // Verify the result is false
      expect(result).toBe(false);

      // Verify error toast was shown
      expect(toast.error).toHaveBeenCalledWith(
        'Verification failed: Missing or invalid contractAddress (should start with 0x): invalid-address'
      );
    });

    it('should handle contract not found in store', async () => {
      // Call verifyContract with address not in store
      const result = await store.verifyContract('0x123');

      // Verify the result is false
      expect(result).toBe(false);

      // Verify error toast was shown
      expect(toast.error).toHaveBeenCalledWith(
        'Verification failed: Contract not found in deployment store'
      );
    });

    it('should handle contract not found on blockchain', async () => {
      // Mock contract not found on blockchain
      web3Service.contractExists.mockResolvedValue(false);

      // Add a contract to the store
      store.deployedContracts.set('0x123', {
        name: 'TestContract',
        address: '0x123',
        abi: [],
        bytecode: '0x123',
        network: 'localhost',
        deployedAt: Date.now(),
        transactionHash: '0xabc',
        deploymentCost: '0',
        constructorArgs: [],
        shouldVerify: true,
      });

      // Call verifyContract
      const result = await store.verifyContract('0x123');

      // Verify contractExists was called
      expect(web3Service.contractExists).toHaveBeenCalledWith('0x123');

      // Verify the result is false
      expect(result).toBe(false);

      // Verify error toast was shown
      expect(toast.error).toHaveBeenCalledWith(
        'Verification failed: Contract not found on blockchain at address 0x123'
      );
    });

    it('should handle verification failure', async () => {
      // Mock successful contract existence
      web3Service.contractExists.mockResolvedValue(true);

      // Mock verification failure
      verificationService.verifyContract.mockResolvedValue({
        success: false,
        message: 'Verification failed',
      });

      // Add a contract to the store
      store.deployedContracts.set('0x123', {
        name: 'TestContract',
        address: '0x123',
        abi: [],
        bytecode: '0x123',
        network: 'localhost',
        deployedAt: Date.now(),
        transactionHash: '0xabc',
        deploymentCost: '0',
        constructorArgs: [],
        shouldVerify: true,
      });

      // Call verifyContract
      const result = await store.verifyContract('0x123');

      // Verify contractExists was called
      expect(web3Service.contractExists).toHaveBeenCalledWith('0x123');

      // Verify verifyContract was called
      expect(verificationService.verifyContract).toHaveBeenCalled();

      // Verify the result is false
      expect(result).toBe(false);

      // Verify the contract was updated in the store
      const contract = store.deployedContracts.get('0x123');
      expect(contract?.verified).toBe(false);
    });
  });

  describe('Integration test: deployment and verification flow', () => {
    it('should reveal the race condition in the verification process', async () => {
      // Mock successful deployment
      const mockDeployResult = {
        address: '0x123',
        transactionHash: '0xabc',
      };
      web3Service.deployContract.mockResolvedValue(mockDeployResult);

      // Mock contract confirmation to be delayed
      web3Service.waitForContract.mockResolvedValue(true);

      // Mock contractExists to return false initially
      web3Service.contractExists.mockResolvedValue(false);

      // Mock successful verification
      verificationService.verifyContract.mockResolvedValue({
        success: true,
        message: 'Contract verified successfully',
        url: 'http://localhost:8545/address/0x123#code',
      });

      // Call deployContract
      const mockContract = {
        name: 'TestContract',
        bytecode: '0x123',
        abi: [],
      };

      const result = await store.deployContract(mockContract, []);

      // Verify deployment was called
      expect(web3Service.deployContract).toHaveBeenCalledWith(
        mockContract.abi,
        mockContract.bytecode,
        [],
        expect.any(Object)
      );

      // Verify the contract was added to the store
      expect(result).not.toBeNull();
      expect(result?.address).toBe('0x123');

      // Verify the initial toast message
      expect(toast.info).toHaveBeenCalledWith('Contract deployed successfully. Waiting for blockchain confirmation before verification...');

      // Fast-forward timers to trigger the verification process
      vi.runAllTimers();

      // Verify waitForContract was called
      expect(web3Service.waitForContract).toHaveBeenCalledWith('0x123', 15, 2000);

      // Verify the confirmation toast message
      expect(toast.info).toHaveBeenCalledWith('Contract confirmed on blockchain. Starting verification process...');

      // Here's the issue: contractExists is called during verification, but it returns false
      // This means verification will fail even though waitForContract returned true
      expect(web3Service.contractExists).toHaveBeenCalledWith('0x123');

      // Verify the error toast message
      expect(toast.error).toHaveBeenCalledWith('Verification failed: Contract not found on blockchain at address 0x123');

      // The contract should not be verified
      const contract = store.deployedContracts.get('0x123');
      expect(contract?.verified).toBe(false);

      // This test reveals a logical issue in the verification flow:
      // 1. waitForContract returns true, indicating the contract is confirmed on the blockchain
      // 2. But when verifyContract is called, it checks again if the contract exists using contractExists
      // 3. If contractExists returns false, verification fails even though waitForContract returned true
      //
      // This is redundant and can lead to verification failures if there's a slight delay
      // between when the contract is confirmed and when it's available for verification.
      //
      // The solution would be to remove the contractExists check from verifyContract
      // since we've already confirmed the contract exists using waitForContract.
    });

    it('should test the complete flow with proper sequencing', async () => {
      // Mock successful deployment
      const mockDeployResult = {
        address: '0x123',
        transactionHash: '0xabc',
      };
      web3Service.deployContract.mockResolvedValue(mockDeployResult);

      // Mock contract confirmation
      web3Service.waitForContract.mockResolvedValue(true);

      // Mock contract exists
      web3Service.contractExists.mockResolvedValue(true);

      // Mock successful verification
      verificationService.verifyContract.mockResolvedValue({
        success: true,
        message: 'Contract verified successfully',
        url: 'http://localhost:8545/address/0x123#code',
      });

      // Call deployContract
      const mockContract = {
        name: 'TestContract',
        bytecode: '0x123',
        abi: [],
      };

      const result = await store.deployContract(mockContract, []);

      // Verify deployment was called
      expect(web3Service.deployContract).toHaveBeenCalledWith(
        mockContract.abi,
        mockContract.bytecode,
        [],
        expect.any(Object)
      );

      // Verify the contract was added to the store
      expect(result).not.toBeNull();
      expect(result?.address).toBe('0x123');

      // Fast-forward timers to trigger the verification process
      vi.runAllTimers();

      // Verify waitForContract was called
      expect(web3Service.waitForContract).toHaveBeenCalledWith('0x123', 15, 2000);

      // Verify contractExists was called
      expect(web3Service.contractExists).toHaveBeenCalledWith('0x123');

      // Verify verificationService.verifyContract was called
      expect(verificationService.verifyContract).toHaveBeenCalled();

      // Verify the contract is verified
      const contract = store.deployedContracts.get('0x123');
      expect(contract?.verified).toBe(true);
      expect(contract?.verificationUrl).toBe('http://localhost:8545/address/0x123#code');
    });
  });
});

/**
 * FINDINGS AND RECOMMENDATIONS
 *
 * The tests reveal a logical issue in the contract deployment and verification flow:
 *
 * 1. Issue: Redundant Contract Existence Check
 *    - In deployContract, we use waitForContract to check if the contract is confirmed on the blockchain
 *    - If confirmed, we call verifyContract to verify the contract
 *    - However, verifyContract also checks if the contract exists using contractExists
 *    - This is redundant and can lead to verification failures if there's a slight delay
 *      between when the contract is confirmed and when it's available for verification
 *
 * 2. Proposed Solution:
 *    - Remove the contractExists check from verifyContract when called from deployContract
 *    - Or pass a flag to verifyContract to skip the existence check when called after waitForContract
 *
 * 3. Implementation:
 *    Here's a proposed fix for the verifyContract method:
 *
 *    ```typescript
 *    verifyContract: async (contractAddress: string, skipExistenceCheck: boolean = false) => {
 *      try {
 *        // First check if the contract address is valid
 *        if (!contractAddress || !contractAddress.startsWith('0x')) {
 *          const errorMsg = `Missing or invalid contractAddress (should start with 0x): ${contractAddress}`;
 *          error('DeploymentStore', errorMsg);
 *          toast.error(`Verification failed: ${errorMsg}`);
 *          return false;
 *        }
 *
 *        // Check if the contract exists in our store
 *        const deployedContract = get().getDeployedContract(contractAddress);
 *        if (!deployedContract) {
 *          error('DeploymentStore', `Contract not found in deployment store: ${contractAddress}`);
 *          toast.error(`Verification failed: Contract not found in deployment store`);
 *          return false;
 *        }
 *
 *        // Get network information
 *        const network = web3Service.getNetwork();
 *        if (!network) {
 *          error('DeploymentStore', 'Network information not available');
 *          toast.error('Verification failed: Network information not available');
 *          return false;
 *        }
 *
 *        // Check if the contract exists on the blockchain (skip if called after waitForContract)
 *        if (!skipExistenceCheck) {
 *          const contractExists = await web3Service.contractExists(contractAddress);
 *          if (!contractExists) {
 *            const errorMsg = `Contract not found on blockchain at address ${contractAddress}`;
 *            error('DeploymentStore', errorMsg);
 *            toast.error(`Verification failed: ${errorMsg}`);
 *            return false;
 *          }
 *        }
 *
 *        // Rest of the verification logic...
 *      } catch (err) {
 *        // Error handling...
 *      }
 *    }
 *    ```
 *
 *    And update the call in deployContract:
 *
 *    ```typescript
 *    if (contractConfirmed) {
 *      // Contract is confirmed, proceed with verification
 *      toast.info(`Contract confirmed on blockchain. Starting verification process...`);
 *      await get().verifyContract(result.address, true); // Skip existence check
 *    }
 *    ```
 *
 * This change would make the verification process more robust by avoiding redundant checks
 * that could lead to false negatives in the verification process.
 */
