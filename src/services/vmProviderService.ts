import { debug, error, info, warn } from '@/services/loggerService';
import type { JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers';
import { createVM, runTx, type VM } from '@ethereumjs/vm';
import { Common, type Hardfork, Mainnet, Hardfork } from '@ethereumjs/common';
import {
  bytesToHex,
  createAccount,
  createAddressFromString,
  createAddressFromPrivateKey,
  hexToBytes,
  privateToAddress,
  setLengthLeft,
  toBytes,
} from '@ethereumjs/util';
import { createLegacyTx, createTx, createTxFromRLP, type TypedTransaction } from '@ethereumjs/tx';
import { SimpleStateManager } from '@ethereumjs/statemanager';
import { createBlock } from '@ethereumjs/block';
import { type Blockchain, createBlockchain } from '@ethereumjs/blockchain';
import { AbiCoder, Interface } from 'ethers';

import { getAccountNonce, insertAccount } from './helpers/account-utils';
import { buildTransaction, encodeDeployment, encodeFunction } from './helpers/tx-builder';

import type { Address, PrefixedHexString } from '@ethereumjs/util';

interface VMAccount {
  address: string;
  privateKey: string;
  balance: string;
}

interface VMOptions {
  chainId: number;
  networkId: number;
  hardfork: string;
  accounts: { secretKey: string; balance: string }[];
  blockTime: number;
  defaultGasPrice: bigint;
  defaultBaseFeePerGas: bigint;
}

class VMProviderService {
  private static instance: VMProviderService;
  private vm: VM | null = null;
  private blockchain: Blockchain | null = null;
  private common: Common | null = null;
  private jsonRpcServer: any = null;
  private isRunning = false;
  private accounts: VMAccount[] = [];
  private options: VMOptions;
  private blockNumber = 0n;
  private transactionReceipts = new Map<string, any>();
  private pendingTransactions = new Map<string, TypedTransaction>();
  private blockTimestamp = BigInt(Math.floor(Date.now() / 1000));
  private miningInterval: NodeJS.Timeout | null = null;

  private constructor() {
    const predefinedAccounts = [
      {
        secretKey: '0x503f38a9c967ed597e47fe25643985f032b072db8075426a92110f82df48dfcb',
        balance: '0x56BC75E2D630E8000',
      },
      {
        secretKey: '0x7e5bfb82febc4c2c8529167104271ceec190eafdca277314912eaabdb67c6e5f',
        balance: '0x56BC75E2D630E8000',
      },
      {
        secretKey: '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c5cf5520e4e6fc7dda',
        balance: '0x56BC75E2D630E8000',
      },
      {
        secretKey: '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
        balance: '0x56BC75E2D630E8000',
      },
      {
        secretKey: '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
        balance: '0x56BC75E2D630E8000',
      },
      {
        secretKey: '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913',
        balance: '0x56BC75E2D630E8000',
      },
      {
        secretKey: '0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743',
        balance: '0x56BC75E2D630E8000',
      },
      {
        secretKey: '0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd',
        balance: '0x56BC75E2D630E8000',
      },
      {
        secretKey: '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52',
        balance: '0x56BC75E2D630E8000',
      },
      {
        secretKey: '0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3',
        balance: '0x56BC75E2D630E8000',
      },
    ];
    this.options = {
      chainId: 1337,
      networkId: 1337,
      hardfork: 'cancun', // Use london hardfork that supports EIP-1559
      accounts: predefinedAccounts,
      blockTime: 0,
      defaultGasPrice: 20_000_000_000n,
      defaultBaseFeePerGas: 1_000_000_000n,
    };
    debug('VMProviderService', 'Initializing VMProviderService');
  }

  /**
   * Check if the current hardfork supports EIP-1559 (baseFeePerGas)
   * @returns true if EIP-1559 is supported, false otherwise
   */
  private supportsEIP1559(): boolean {
    const eip1559Hardforks = ['london', 'arrowGlacier', 'grayGlacier', 'merge', 'shanghai', 'cancun', 'prague'];
    return eip1559Hardforks.includes(this.options.hardfork);
  }

  public static getInstance(): VMProviderService {
    if (!VMProviderService.instance) {
      VMProviderService.instance = new VMProviderService();
    }
    return VMProviderService.instance;
  }

  public async start(): Promise<boolean> {
    try {
      if (this.isRunning) {
        info('VMProviderService', 'JavaScript VM is already running');
        return true;
      }
      info('VMProviderService', 'Starting JavaScript VM...');

      // Initialize Common following the example pattern
      this.common = new Common({
        chain: Mainnet,
        hardfork: this.options.hardfork as Hardfork
      });

      // Override the chainId for local development
      this.common._chainParams.chainId = this.options.chainId;

      // Create VM following the example pattern
      this.vm = await createVM({ common: this.common });

      // Initialize accounts using the helper function
      this.accounts = [];
      for (const acc of this.options.accounts) {
        const privateKeyBytes = hexToBytes(acc.secretKey);
        const addressBytes = privateToAddress(privateKeyBytes);
        const address = bytesToHex(addressBytes);
        try {
          const balance = BigInt(acc.balance);
          const accountAddress = createAddressFromString(address);

          // Use the helper function to insert account
          await insertAccount(this.vm, accountAddress, balance);

          this.accounts.push({
            address,
            privateKey: acc.secretKey,
            balance: (Number(balance) / 1e18).toString() + ' ETH',
          });
          info('VMProviderService', `Account ${address} balance: ${balance.toString()}`);
        } catch (err) {
          error('VMProviderService', `Failed to set up account ${address}`, err);
          continue;
        }
      }

      this.jsonRpcServer = this.createJsonRpcServer();
      this.isRunning = true;
      this.blockNumber = 0n;
      this.blockTimestamp = BigInt(Math.floor(Date.now() / 1000));

      // Start mining interval if blockTime > 0
      if (this.options.blockTime > 0) {
        this.startMining();
      }

      info('VMProviderService', 'JavaScript VM started successfully', {
        accounts: this.accounts.length,
        chainId: this.options.chainId,
        hardfork: this.options.hardfork,
      });
      return true;
    } catch (err) {
      error('VMProviderService', 'Failed to start JavaScript VM', err);
      this.isRunning = false;
      return false;
    }
  }

  public async stop(): Promise<boolean> {
    try {
      if (!this.isRunning) {
        info('VMProviderService', 'JavaScript VM is not running');
        return true;
      }
      info('VMProviderService', 'Stopping JavaScript VM...');

      // Stop mining interval
      if (this.miningInterval) {
        clearInterval(this.miningInterval);
        this.miningInterval = null;
      }

      this.vm = null;
      this.blockchain = null;
      this.common = null;
      this.jsonRpcServer = null;
      this.isRunning = false;
      this.accounts = [];
      this.blockNumber = 0n;
      this.transactionReceipts.clear();
      this.pendingTransactions.clear();
      info('VMProviderService', 'JavaScript VM stopped successfully');
      return true;
    } catch (err) {
      error('VMProviderService', 'Failed to stop JavaScript VM', err);
      return false;
    }
  }

  public isVMRunning(): boolean {
    return this.isRunning;
  }

  public getProvider(): any {
    if (!this.isRunning) {
      warn('VMProviderService', 'Attempting to get provider but JavaScript VM is not running');
    }
    return this.jsonRpcServer;
  }

  public getAccounts(): { address: string; privateKey: string; balance: string }[] {
    return this.accounts;
  }

  public async send(payload: JsonRpcPayload): Promise<JsonRpcResponse> {
    if (!this.isRunning || !this.vm) {
      throw new Error('JavaScript VM is not running');
    }
    try {
      const result = await this.handleJsonRpcRequest({
        method: payload.method,
        params: payload.params,
      });
      return {
        jsonrpc: '2.0',
        id: payload.id || 0,
        result,
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id: payload.id || 0,
        error: {
          code: err.code || -32603,
          message: err.message || 'Internal error',
          data: err.data,
        },
      };
    }
  }

  public async reset(): Promise<boolean> {
    try {
      await this.stop();
      return await this.start();
    } catch (err) {
      error('VMProviderService', 'Failed to reset JavaScript VM', err);
      return false;
    }
  }

  public updateOptions(options: any): void {
    if (options.defaultGasPrice && typeof options.defaultGasPrice === 'number') {
      options.defaultGasPrice = BigInt(options.defaultGasPrice);
    }
    if (options.defaultBaseFeePerGas && typeof options.defaultBaseFeePerGas === 'number') {
      options.defaultBaseFeePerGas = BigInt(options.defaultBaseFeePerGas);
    }
    this.options = {
      ...this.options,
      ...options,
    };
    if (this.isRunning) {
      info('VMProviderService', 'Options updated, restarting JavaScript VM...');
      this.reset().catch((err) => {
        error('VMProviderService', 'Failed to restart JavaScript VM after options update', err);
      });
    }
  }

  private startMining(): void {
    if (this.miningInterval) {
      clearInterval(this.miningInterval);
    }

    this.miningInterval = setInterval(async () => {
      if (this.pendingTransactions.size > 0) {
        await this.mineBlock();
      }
    }, this.options.blockTime * 1000);

    debug('VMProviderService', `Mining started with ${this.options.blockTime}s block time`);
  }

  private async mineBlock(): Promise<void> {
    if (!this.vm || !this.blockchain || !this.common) {
      return;
    }

    try {
      const transactions = Array.from(this.pendingTransactions.values());
      this.pendingTransactions.clear();

      this.blockNumber += 1n;
      this.blockTimestamp = BigInt(Math.floor(Date.now() / 1000));

      // Create block header configuration with conditional EIP-1559 support
      const blockHeaderConfig: any = {
        number: this.blockNumber,
        timestamp: this.blockTimestamp,
        gasLimit: 30_000_000n,
        difficulty: 0n,
        extraData: new Uint8Array(),
        parentHash: (await this.blockchain.getCanonicalHeadBlock()).hash(),
      };

      // Only add baseFeePerGas for EIP-1559 compatible hardforks
      if (this.supportsEIP1559()) {
        blockHeaderConfig.baseFeePerGas = this.options.defaultBaseFeePerGas;
      }

      const block = createBlock(
        {
          header: blockHeaderConfig,
          transactions,
        },
        { common: this.common },
      );

      await this.blockchain.putBlock(block);
      debug(
        'VMProviderService',
        `Mined block ${this.blockNumber} with ${transactions.length} transactions`,
      );
    } catch (err) {
      error('VMProviderService', 'Failed to mine block', err);
    }
  }

  private _storeTransactionReceipt(txHash: string, receipt: any): void {
    this.transactionReceipts.set(txHash, receipt);
    debug('VMProviderService', `Stored receipt for transaction ${txHash}`);
  }

  private _getTransactionReceipt(txHash: string): any {
    const receipt = this.transactionReceipts.get(txHash);
    return receipt || null;
  }

  private generateLogsBloom(logs: any[]): string {
    // Simple bloom filter implementation for logs
    // In a production environment, you'd want a proper bloom filter
    if (logs.length === 0) {
      return '0x' + '0'.repeat(512);
    }

    // For simplicity, we'll generate a basic bloom filter
    // This is a simplified version - a real implementation would use proper bloom filter logic
    const bloom = new Uint8Array(256);

    for (const log of logs) {
      // Add address to bloom
      const addressBytes = hexToBytes(log.address);
      for (let i = 0; i < addressBytes.length; i++) {
        bloom[i % 256] |= addressBytes[i];
      }

      // Add topics to bloom
      for (const topic of log.topics) {
        const topicBytes = hexToBytes(topic);
        for (let i = 0; i < topicBytes.length; i++) {
          bloom[i % 256] |= topicBytes[i];
        }
      }
    }

    return bytesToHex(bloom);
  }

  /**
   * Deploy a contract following the example pattern
   */
  private async deployContract(
    senderPrivateKey: Uint8Array,
    deploymentBytecode: string,
    constructorParams?: { types: string[]; values: any[] }
  ): Promise<Address> {
    if (!this.vm || !this.common) {
      throw new Error('VM not initialized');
    }

    // Create block for transaction execution
    const block = createBlock({ header: { extraData: new Uint8Array(97) } }, { common: this.common });

    // Encode deployment data
    const data = constructorParams
      ? encodeDeployment(deploymentBytecode, constructorParams)
      : hexToBytes(deploymentBytecode);

    const txData = {
      data,
      nonce: await getAccountNonce(this.vm, senderPrivateKey),
    };

    const tx = createLegacyTx(buildTransaction(txData as any), { common: this.common }).sign(senderPrivateKey);

    const deploymentResult = await runTx(this.vm, { tx, block });

    if (deploymentResult.execResult.exceptionError) {
      throw deploymentResult.execResult.exceptionError;
    }

    return deploymentResult.createdAddress!;
  }

  /**
   * Call a contract function following the example pattern
   */
  private async callContractFunction(
    senderPrivateKey: Uint8Array,
    contractAddress: Address,
    functionName: string,
    params?: { types: string[]; values: any[] }
  ): Promise<void> {
    if (!this.vm || !this.common) {
      throw new Error('VM not initialized');
    }

    // Create block for transaction execution
    const block = createBlock({ header: { extraData: new Uint8Array(97) } }, { common: this.common });

    const data = params
      ? encodeFunction(functionName, params)
      : hexToBytes('0x');

    const txData = {
      to: contractAddress,
      data,
      nonce: await getAccountNonce(this.vm, senderPrivateKey),
    };

    const tx = createLegacyTx(buildTransaction(txData as any), { common: this.common }).sign(senderPrivateKey);

    const result = await runTx(this.vm, { tx, block });

    if (result.execResult.exceptionError) {
      throw result.execResult.exceptionError;
    }
  }

  /**
   * Call a view/pure contract function following the example pattern
   */
  private async callViewFunction(
    contractAddress: Address,
    caller: Address,
    functionName: string,
    returnTypes: string[] = ['string']
  ): Promise<any[]> {
    if (!this.vm || !this.common) {
      throw new Error('VM not initialized');
    }

    // Create block for call execution
    const block = createBlock({ header: { extraData: new Uint8Array(97) } }, { common: this.common });

    const sigHash = new Interface([`function ${functionName}()`]).getFunction(functionName)!
      .selector as PrefixedHexString;

    const result = await this.vm.evm.runCall({
      to: contractAddress,
      caller,
      origin: caller,
      data: hexToBytes(sigHash),
      block,
    });

    if (result.execResult.exceptionError) {
      throw result.execResult.exceptionError;
    }

    const results = new AbiCoder().decode(returnTypes, result.execResult.returnValue);
    return results;
  }

  private createJsonRpcServer(): any {
    return {
      request: async (payload: any) => {
        return await this.handleJsonRpcRequest(payload);
      },
    };
  }

  private async handleJsonRpcRequest(payload: any): Promise<any> {
    if (!this.isRunning || !this.vm) {
      throw new Error('JavaScript VM is not running');
    }
    const { method, params = [] } = payload;
    switch (method) {
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return this.accounts.map((account) => account.address);

      case 'eth_getBalance': {
        const address = params[0];
        try {
          const accountAddress = createAddressFromString(address);
          let account;
          try {
            account = await this.vm.stateManager.getAccount(accountAddress);
          } catch {
            account = { balance: 0n };
          }
          return '0x' + account?.balance.toString(16);
        } catch (err) {
          error('VMProviderService', `Failed to get balance for ${address}`, err);
          return '0x0';
        }
      }

      case 'eth_blockNumber':
        return '0x' + this.blockNumber.toString(16);

      case 'eth_chainId':
        return '0x' + BigInt(this.options.chainId).toString(16);

      case 'net_version':
        return this.options.networkId.toString();

      case 'eth_gasPrice':
        return '0x' + this.options.defaultGasPrice.toString(16);

      case 'eth_estimateGas': {
        try {
          const txParams = params[0];
          const txData = {
            to: txParams.to ? createAddressFromString(txParams.to) : undefined,
            from: txParams.from ? createAddressFromString(txParams.from) : undefined,
            nonce: txParams.nonce ? BigInt(txParams.nonce) : 0n,
            gasLimit: txParams.gas ? BigInt(txParams.gas) : 30_000_000n,
            gasPrice: txParams.gasPrice ? BigInt(txParams.gasPrice) : this.options.defaultGasPrice,
            maxFeePerGas: txParams.maxFeePerGas ? BigInt(txParams.maxFeePerGas) : undefined,
            maxPriorityFeePerGas: txParams.maxPriorityFeePerGas
              ? BigInt(txParams.maxPriorityFeePerGas)
              : undefined,
            value: txParams.value ? BigInt(txParams.value) : 0n,
            data: txParams.data ? hexToBytes(txParams.data) : undefined,
            type: txParams.type ? Number(txParams.type) : undefined,
          };
          const tx = createTx(txData, { common: this.common });
          const result = await runTx(this.vm, {
            tx,
            skipBalance: true,
            skipNonce: true,
          });
          const actualGasUsed = result.totalGasSpent || result.gasUsed || 0n;
          const gasUsed = (actualGasUsed * 120n) / 100n;
          return '0x' + gasUsed.toString(16);
        } catch (err) {
          error('VMProviderService', 'Failed to estimate gas', err);
          return '0x' + 30_000_000n.toString(16);
        }
      }

      case 'eth_getTransactionCount': {
        try {
          const address = params[0];
          const accountAddress = createAddressFromString(address);
          const account = await this.vm.stateManager.getAccount(accountAddress);
          return '0x' + account?.nonce.toString(16);
        } catch (err) {
          debug('VMProviderService', `Account not found for nonce check: ${params[0]}`);
          return '0x0';
        }
      }

      case 'eth_getCode': {
        info('VMProviderService', `eth_getCode called for address: ${params[0]}`);
        try {
          const address = params[0];
          const accountAddress = createAddressFromString(address);
          const rawCode = await this.vm.stateManager.getCode(accountAddress);

          // Trim trailing null bytes that might be added by the VM
          let trimmedLength = rawCode.length;
          while (trimmedLength > 0 && rawCode[trimmedLength - 1] === 0) {
            trimmedLength--;
          }
          const code = rawCode.slice(0, trimmedLength);

          info('VMProviderService', `Getting code for address ${address}: ${rawCode.length} bytes (raw), ${code.length} bytes (trimmed)`);
          info('VMProviderService', `Code preview: ${bytesToHex(code.slice(0, 32))}`);
          const result = bytesToHex(code);
          info('VMProviderService', `Returning code result: ${result.substring(0, 50)}...`);
          return result;
        } catch (err) {
          error('VMProviderService', `Failed to get code for ${params[0]}`, err);
          return '0x';
        }
      }

      case 'eth_sendTransaction': {
        try {
          const txParams = params[0];
          const fromAddress = txParams.from.toLowerCase();
          const account = this.accounts.find((acc) => acc.address.toLowerCase() === fromAddress);
          if (!account) throw new Error(`Account ${fromAddress} not found`);

          const privateKey = hexToBytes(account.privateKey);
          let result: any;
          let createdAddress: Address | null = null;

          // Check if this is a contract deployment (no 'to' address)
          if (!txParams.to) {
            // Contract deployment using the example pattern
            const deploymentBytecode = txParams.data;
            if (!deploymentBytecode) {
              throw new Error('No deployment bytecode provided');
            }

            info('VMProviderService', 'Deploying contract with bytecode:', deploymentBytecode.substring(0, 50) + '...');
            createdAddress = await this.deployContract(privateKey, deploymentBytecode);
            info('VMProviderService', `Contract deployed at address: ${bytesToHex(createdAddress.bytes)}`);
          } else {
            // Contract interaction using the example pattern
            const contractAddress = createAddressFromString(txParams.to);
            info('VMProviderService', `Calling contract at ${txParams.to} with data: ${txParams.data}`);

            // Create block for transaction execution
            const block = createBlock({ header: { extraData: new Uint8Array(97) } }, { common: this.common });

            const txData = {
              to: contractAddress,
              data: txParams.data ? hexToBytes(txParams.data) : new Uint8Array(),
              nonce: await getAccountNonce(this.vm!, privateKey),
            };

            const tx = createLegacyTx(buildTransaction(txData as any), { common: this.common }).sign(privateKey);
            const txResult = await runTx(this.vm!, { tx, block });

            if (txResult.execResult.exceptionError) {
              throw txResult.execResult.exceptionError;
            }
          }

          // Generate a transaction hash (simplified)
          const txHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');

          // Increment block number for immediate mining
          this.blockNumber += 1n;
          this.blockTimestamp = BigInt(Math.floor(Date.now() / 1000));

          // Create a simplified receipt
          const receipt = {
            transactionHash: txHash,
            transactionIndex: '0x0',
            blockNumber: '0x' + this.blockNumber.toString(16),
            blockHash: '0x' + this.blockNumber.toString(16).padStart(64, '0'),
            from: account.address,
            to: txParams.to || null,
            gasUsed: '0x' + (21000n).toString(16), // Simplified gas calculation
            cumulativeGasUsed: '0x' + (21000n).toString(16),
            contractAddress: createdAddress ? bytesToHex(createdAddress.bytes) : null,
            logs: [],
            status: '0x1',
            logsBloom: '0x' + '0'.repeat(512),
            effectiveGasPrice: '0x' + this.options.defaultGasPrice.toString(16),
          };

          this._storeTransactionReceipt(txHash, receipt);

          return txHash;
        } catch (err) {
          error('VMProviderService', 'Failed to execute transaction', err);
          throw err;
        }
      }

      case 'eth_call': {
        try {
          const txParams = params[0];
          const fromAddress = txParams.from || this.accounts[0]?.address;

          info('VMProviderService', `eth_call to ${txParams.to} with data: ${txParams.data}`, txParams);

          if (!txParams.to) {
            throw new Error('Contract address is required for eth_call');
          }

          const contractAddress = createAddressFromString(txParams.to);
          const caller = createAddressFromString(fromAddress);

          // Use the example pattern for view function calls
          // Create block for call execution
          const block = createBlock({ header: { extraData: new Uint8Array(97) } }, { common: this.common });

          const result = await this.vm!.evm.runCall({
            to: contractAddress,
            caller,
            origin: caller,
            data: txParams.data ? hexToBytes(txParams.data) : new Uint8Array(),
            block,
          });

          info('VMProviderService', 'Call execution result:', {
            exceptionError: result.execResult.exceptionError?.error,
            returnValue: bytesToHex(result.execResult.returnValue),
            returnValueLength: result.execResult.returnValue.length,
          });

          if (result.execResult.exceptionError) {
            // For view/pure functions, some "reverts" might be normal (like require statements)
            // Let's return empty data instead of throwing for better compatibility
            warn('VMProviderService', `Call execution error: ${result.execResult.exceptionError.error}`);
            return '0x';
          }

          return bytesToHex(result.execResult.returnValue);
        } catch (err) {
          error('VMProviderService', 'Failed to execute call', err);
          throw err;
        }
      }

      case 'eth_getTransactionReceipt': {
        try {
          const txHash = params[0];
          return this._getTransactionReceipt(txHash);
        } catch (err) {
          debug('VMProviderService', `Failed to get transaction receipt for ${params[0]}`, err);
          return null;
        }
      }

      case 'eth_getBlockByNumber': {
        try {
          let blockNum: bigint;
          if (params[0] === 'latest') blockNum = this.blockNumber;
          else if (params[0] === 'earliest') blockNum = 0n;
          else if (params[0] === 'pending') blockNum = this.blockNumber;
          else blockNum = BigInt(params[0]);
          const includeTransactions = params[1] || false;
          const blockNumberBytes = setLengthLeft(toBytes('0x' + blockNum.toString(16)), 32);
          const blockHash = bytesToHex(blockNumberBytes);
          const parentBlockNum = blockNum > 0n ? blockNum - 1n : 0n;
          const parentBlockNumberBytes = setLengthLeft(
            toBytes('0x' + parentBlockNum.toString(16)),
            32,
          );
          const parentBlockHash = bytesToHex(parentBlockNumberBytes);
          const transactions = [];
          if (includeTransactions) {
            for (const [_, receipt] of this.transactionReceipts.entries()) {
              if (receipt.blockNumber === '0x' + blockNum.toString(16)) {
                transactions.push({
                  hash: receipt.transactionHash,
                  nonce: '0x0',
                  blockHash: receipt.blockHash,
                  blockNumber: receipt.blockNumber,
                  transactionIndex: receipt.transactionIndex,
                  from: receipt.from,
                  to: receipt.to,
                  value: '0x0',
                  gas: '0x' + 30_000_000n.toString(16),
                  gasPrice: '0x' + this.options.defaultGasPrice.toString(16),
                  input: '0x',
                });
              }
            }
          } else {
            for (const [_, receipt] of this.transactionReceipts.entries()) {
              if (receipt.blockNumber === '0x' + blockNum.toString(16)) {
                transactions.push(receipt.transactionHash);
              }
            }
          }
          let totalGasUsed = 0n;
          for (const [_, receipt] of this.transactionReceipts.entries()) {
            if (receipt.blockNumber === '0x' + blockNum.toString(16)) {
              totalGasUsed += BigInt(receipt.gasUsed);
            }
          }
          return {
            number: '0x' + blockNum.toString(16),
            hash: blockHash,
            parentHash: parentBlockHash,
            nonce: '0x0000000000000000',
            sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
            logsBloom: '0x' + '0'.repeat(512),
            transactionsRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
            stateRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
            receiptsRoot: '0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421',
            miner: '0x0000000000000000000000000000000000000000',
            difficulty: '0x0',
            totalDifficulty: '0x0',
            extraData: '0x',
            size: '0x0',
            gasLimit: '0x' + 30_000_000n.toString(16),
            gasUsed: '0x' + totalGasUsed.toString(16),
            timestamp: '0x' + Math.floor(Date.now() / 1000).toString(16),
            transactions,
            uncles: [],
            baseFeePerGas: '0x' + this.options.defaultBaseFeePerGas.toString(16),
          };
        } catch (err) {
          error('VMProviderService', `Failed to get block by number: ${params[0]}`, err);
          return null;
        }
      }

      case 'eth_getBlockByHash': {
        try {
          const blockHash = params[0];
          const includeTransactions = params[1] || false;
          let foundBlockNum = null;
          for (let i = 0n; i <= this.blockNumber; i++) {
            const blockNumberBytes = setLengthLeft(toBytes('0x' + i.toString(16)), 32);
            const calculatedHash = bytesToHex(blockNumberBytes);
            if (calculatedHash === blockHash) {
              foundBlockNum = i;
              break;
            }
          }
          if (foundBlockNum === null) return null;
          return await this.handleJsonRpcRequest({
            method: 'eth_getBlockByNumber',
            params: ['0x' + foundBlockNum.toString(16), includeTransactions],
          });
        } catch (err) {
          error('VMProviderService', `Failed to get block by hash: ${params[0]}`, err);
          return null;
        }
      }

      case 'eth_getLogs': {
        try {
          const filter = params[0] || {};
          const logs: any[] = [];

          // Parse block range
          let fromBlock = 0n;
          let toBlock = this.blockNumber;

          if (filter.fromBlock) {
            if (filter.fromBlock === 'earliest') fromBlock = 0n;
            else if (filter.fromBlock === 'latest') fromBlock = this.blockNumber;
            else if (filter.fromBlock === 'pending') fromBlock = this.blockNumber;
            else fromBlock = BigInt(filter.fromBlock);
          }

          if (filter.toBlock) {
            if (filter.toBlock === 'earliest') toBlock = 0n;
            else if (filter.toBlock === 'latest') toBlock = this.blockNumber;
            else if (filter.toBlock === 'pending') toBlock = this.blockNumber;
            else toBlock = BigInt(filter.toBlock);
          }

          // Collect logs from transaction receipts
          for (const [_, receipt] of this.transactionReceipts.entries()) {
            const blockNum = BigInt(receipt.blockNumber);
            if (blockNum >= fromBlock && blockNum <= toBlock) {
              for (const log of receipt.logs || []) {
                let matchesFilter = true;

                // Filter by address
                if (filter.address) {
                  const addresses = Array.isArray(filter.address)
                    ? filter.address
                    : [filter.address];
                  if (
                    !addresses.some(
                      (addr: string) => addr.toLowerCase() === log.address.toLowerCase(),
                    )
                  ) {
                    matchesFilter = false;
                  }
                }

                // Filter by topics
                if (filter.topics && matchesFilter) {
                  for (let i = 0; i < filter.topics.length; i++) {
                    const filterTopic = filter.topics[i];
                    if (filterTopic !== null && filterTopic !== undefined) {
                      const topicsToMatch = Array.isArray(filterTopic)
                        ? filterTopic
                        : [filterTopic];
                      const logTopic = log.topics[i];
                      if (
                        !logTopic ||
                        !topicsToMatch.some(
                          (topic: string) => topic.toLowerCase() === logTopic.toLowerCase(),
                        )
                      ) {
                        matchesFilter = false;
                        break;
                      }
                    }
                  }
                }

                if (matchesFilter) {
                  logs.push(log);
                }
              }
            }
          }

          return logs;
        } catch (err) {
          error('VMProviderService', 'Failed to get logs', err);
          return [];
        }
      }

      case 'eth_getStorageAt': {
        try {
          const address = params[0];
          const position = params[1];
          const accountAddress = createAddressFromString(address);
          const value = await this.vm.stateManager.getContractStorage(
            accountAddress,
            toBytes(position),
          );
          return bytesToHex(setLengthLeft(value, 32));
        } catch (err) {
          error('VMProviderService', `Failed to get storage at ${params[0]}:${params[1]}`, err);
          return '0x' + '0'.repeat(64);
        }
      }

      case 'eth_getTransactionByHash': {
        try {
          const txHash = params[0];
          const receipt = this._getTransactionReceipt(txHash);
          if (!receipt) return null;
          return {
            hash: receipt.transactionHash,
            nonce: '0x0',
            blockHash: receipt.blockHash,
            blockNumber: receipt.blockNumber,
            transactionIndex: receipt.transactionIndex,
            from: receipt.from,
            to: receipt.to,
            value: '0x0',
            gas: '0x' + 30_000_000n.toString(16),
            gasPrice: '0x' + this.options.defaultGasPrice.toString(16),
            input: '0x',
          };
        } catch (err) {
          error('VMProviderService', `Failed to get transaction by hash: ${params[0]}`, err);
          return null;
        }
      }

      case 'web3_clientVersion':
        return 'RemixVM/1.0.0';

      case 'net_listening':
        return true;

      case 'net_peerCount':
        return '0x0';

      case 'eth_protocolVersion':
        return '0x41'; // 65 in decimal

      case 'eth_syncing':
        return false;

      case 'eth_coinbase':
        return this.accounts.length > 0
          ? this.accounts[0].address
          : '0x0000000000000000000000000000000000000000';

      case 'eth_mining':
        return this.options.blockTime > 0;

      case 'eth_hashrate':
        return '0x0';

      case 'eth_newFilter':
      case 'eth_newBlockFilter':
      case 'eth_newPendingTransactionFilter':
        // Return a dummy filter ID - in a full implementation, you'd track these
        return '0x' + Math.random().toString(16).substr(2, 8);

      case 'eth_uninstallFilter':
        return true;

      case 'eth_getFilterChanges':
      case 'eth_getFilterLogs':
        // Return empty array for now - in a full implementation, you'd track filter state
        return [];

      case 'eth_sign':
        try {
          const address = params[0];
          const message = params[1];
          const account = this.accounts.find(
            (acc) => acc.address.toLowerCase() === address.toLowerCase(),
          );
          if (!account) throw new Error(`Account ${address} not found`);

          // Simple message signing - in production, you'd use proper ECDSA signing
          const privateKey = hexToBytes(account.privateKey);
          const messageHash = hexToBytes(message);

          // This is a simplified signature - use proper crypto libraries in production
          return '0x' + bytesToHex(messageHash) + bytesToHex(privateKey.slice(0, 32));
        } catch (err) {
          error('VMProviderService', 'Failed to sign message', err);
          throw err;
        }

      case 'personal_sign':
        try {
          const message = params[0];
          const address = params[1];
          const account = this.accounts.find(
            (acc) => acc.address.toLowerCase() === address.toLowerCase(),
          );
          if (!account) throw new Error(`Account ${address} not found`);

          // Simple personal message signing
          const privateKey = hexToBytes(account.privateKey);
          const messageHash = hexToBytes(message);

          return '0x' + bytesToHex(messageHash) + bytesToHex(privateKey.slice(0, 32));
        } catch (err) {
          error('VMProviderService', 'Failed to sign personal message', err);
          throw err;
        }

      case 'eth_sendRawTransaction':
        try {
          const rawTx = params[0];
          const txBytes = hexToBytes(rawTx);
          const tx = createTxFromRLP(txBytes, { common: this.common });

          // Execute the raw transaction
          const result = await runTx(this.vm, { tx });
          const txHash = bytesToHex(tx.hash());

          // Process logs and create receipt (similar to eth_sendTransaction)
          const logs =
            result.execResult.logs?.map((log, index) => ({
              address: bytesToHex(log[0]),
              topics: log[1].map((topic: Uint8Array) => bytesToHex(topic)),
              data: bytesToHex(log[2]),
              blockNumber: '0x' + (this.blockNumber + 1n).toString(16),
              transactionHash: txHash,
              transactionIndex: '0x0',
              blockHash: '0x' + (this.blockNumber + 1n).toString(16).padStart(64, '0'),
              logIndex: '0x' + index.toString(16),
              removed: false,
            })) || [];

          this.blockNumber += 1n;
          this.blockTimestamp = BigInt(Math.floor(Date.now() / 1000));

          // Handle gasUsed - it might be in totalGasSpent or gasUsed
          const gasUsed = result.totalGasSpent || result.gasUsed || 0n;

          const receipt = {
            transactionHash: txHash,
            transactionIndex: '0x0',
            blockNumber: '0x' + this.blockNumber.toString(16),
            blockHash: '0x' + this.blockNumber.toString(16).padStart(64, '0'),
            from: tx.getSenderAddress()?.toString() || '0x0000000000000000000000000000000000000000',
            to: tx.to?.toString() || null,
            gasUsed: '0x' + gasUsed.toString(16),
            cumulativeGasUsed: '0x' + gasUsed.toString(16),
            contractAddress: result.createdAddress ? bytesToHex(result.createdAddress.bytes) : null,
            logs,
            status: result.execResult.exceptionError ? '0x0' : '0x1',
            logsBloom: this.generateLogsBloom(logs),
          };

          this._storeTransactionReceipt(txHash, receipt);
          return txHash;
        } catch (err) {
          error('VMProviderService', 'Failed to send raw transaction', err);
          throw err;
        }

      default:
        debug('VMProviderService', `Method ${method} not implemented, returning default value`);
        return method.includes('eth_get') ? null : '0x';
    }
  }
}

export const vmProviderService = VMProviderService.getInstance();
