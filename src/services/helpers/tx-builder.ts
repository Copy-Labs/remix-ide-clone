import { AbiCoder, Interface } from 'ethers'
import { hexToBytes } from '@ethereumjs/util'
import type { TxData } from '@ethereumjs/tx'

/**
 * Build transaction data with default values
 */
export function buildTransaction(txData: Partial<TxData>): TxData {
  return {
    nonce: txData.nonce || 0n,
    gasLimit: txData.gasLimit || 30_000_000n,
    gasPrice: txData.gasPrice || 1_000_000_000n,
    to: txData.to,
    value: txData.value || 0n,
    data: txData.data,
    ...txData,
  }
}

/**
 * Encode deployment bytecode with constructor parameters
 */
export function encodeDeployment(
  bytecode: string,
  params: { types: string[]; values: any[] }
): Uint8Array {
  const abiCoder = new AbiCoder()
  const encodedParams = abiCoder.encode(params.types, params.values)
  const deploymentData = bytecode + encodedParams.slice(2) // Remove '0x' prefix from encoded params
  return hexToBytes(deploymentData)
}

/**
 * Encode function call data
 */
export function encodeFunction(
  functionName: string,
  params: { types: string[]; values: any[] }
): Uint8Array {
  const functionSignature = `${functionName}(${params.types.join(',')})`
  const iface = new Interface([`function ${functionSignature}`])
  const encodedData = iface.encodeFunctionData(functionName, params.values)
  return hexToBytes(encodedData)
}
