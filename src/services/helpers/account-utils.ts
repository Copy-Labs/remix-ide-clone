import { createAccount, createAddressFromPrivateKey } from '@ethereumjs/util'
import type { Address } from '@ethereumjs/util'
import type { VM } from '@ethereumjs/vm'

/**
 * Get the nonce for an account
 */
export async function getAccountNonce(vm: VM, privateKey: Uint8Array): Promise<bigint> {
  const address = createAddressFromPrivateKey(privateKey)
  const account = await vm.stateManager.getAccount(address)
  return account?.nonce || 0n
}

/**
 * Insert an account into the VM state
 */
export async function insertAccount(vm: VM, address: Address, balance?: bigint): Promise<void> {
  const account = createAccount({
    nonce: 0n,
    balance: balance || 100000000000000000000n // 100 ETH default
  })
  await vm.stateManager.putAccount(address, account)
}
