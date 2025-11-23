# Farcaster Mini App Connector - Critical Workaround

## ⚠️ CRITICAL: This Project Uses Farcaster Mini App Connector

**IMPORTANT:** This project uses the **Farcaster Mini App connector** (`@farcaster/miniapp-wagmi-connector`) for wallet integration. This connector has a **critical limitation** that MUST be handled correctly.

## The Problem

The Farcaster Mini App connector **does NOT implement the `getChainId()` method** that Wagmi expects. This causes the following error when using Wagmi hooks:

```
r.connector.getChainId is not a function
```

This error occurs when:
- Using `useWriteContract` hook
- Using `useSwitchChain` hook  
- Accessing `chainId` from `useAccount()` hook
- Any Wagmi operation that internally calls `connector.getChainId()`

## The Solution

A **complete wrapper** has been implemented in `frontend/lib/wagmi-config.ts` that:

1. **Implements `getChainId()`** - Always returns Celo Mainnet (42220)
2. **Forwards all other methods** - All connector functionality works normally
3. **Uses Proxy pattern** - Ensures `getChainId` is always available regardless of access method

## Rules for Working with Farcaster Connector

### ✅ DO:

1. **Always use `APP_CONFIG.DEFAULT_CHAIN.id`** for chain ID instead of getting it from `useAccount()`
   ```typescript
   // ✅ CORRECT
   const targetChainId = APP_CONFIG.DEFAULT_CHAIN.id || 42220
   
   // ❌ WRONG - Don't do this
   const { chainId } = useAccount() // This will fail!
   ```

2. **Never use `useSwitchChain` hook** - It internally calls `getChainId` which fails
   ```typescript
   // ✅ CORRECT - Don't use useSwitchChain
   // Just specify chainId in writeContract, the wallet will handle switching
   writeContract({
     address: contractAddress,
     abi: contractABI,
     functionName: 'someFunction',
     args: [...],
     chainId: targetChainId, // Wallet will prompt to switch if needed
   })
   
   // ❌ WRONG - Don't do this
   const { switchChain } = useSwitchChain()
   await switchChain({ chainId: targetChainId }) // This will fail!
   ```

3. **Always use the wrapped connector** - The wrapper in `wagmi-config.ts` handles everything
   ```typescript
   // ✅ CORRECT - The config already uses the wrapped connector
   export const config = createConfig({
     connectors: [farcasterConnector] // This is the wrapped version
   })
   ```

### ❌ DON'T:

1. **Never access `chainId` from `useAccount()`**
   ```typescript
   // ❌ WRONG
   const { address, chainId } = useAccount() // chainId will cause errors
   
   // ✅ CORRECT
   const { address } = useAccount()
   const chainId = APP_CONFIG.DEFAULT_CHAIN.id
   ```

2. **Never use `useSwitchChain` hook**
   ```typescript
   // ❌ WRONG
   import { useSwitchChain } from 'wagmi'
   const { switchChain } = useSwitchChain()
   
   // ✅ CORRECT
   // Just specify chainId in writeContract, wallet handles switching
   ```

3. **Never modify the connector wrapper** - The wrapper in `wagmi-config.ts` is critical and must not be changed without understanding the full implications

## Implementation Details

The wrapper is implemented in `frontend/lib/wagmi-config.ts` with multiple layers of protection:

1. **Direct Assignment** - Immediately assigns `getChainId` to the connector
2. **Property Descriptor** - Uses `Object.defineProperty` to ensure it's always there
3. **Prototype Chain** - Patches all prototype levels
4. **Proxy Wrapper** - Intercepts ALL property access to always return `getChainId`
5. **Global Interceptors** - Patches `Object.getOwnPropertyDescriptor` and `hasOwnProperty`
6. **Internal Patching** - Patches Wagmi's internal connector storage after config creation
7. **Final Safety Check** - Last resort check to ensure `getChainId` is always callable

**If you see the error again**, it means Wagmi is accessing the connector in a way we haven't intercepted yet. Check:
- Are you using `useSwitchChain` anywhere? (DON'T!)
- Are you accessing `chainId` from `useAccount()`? (DON'T!)
- Is the connector being accessed before our patches apply?

## Testing

When testing or debugging:

1. **Check for `getChainId` errors** - If you see "r.connector.getChainId is not a function", the wrapper is not working
2. **Verify chain ID usage** - All hooks should use `APP_CONFIG.DEFAULT_CHAIN.id`, not `useAccount().chainId`
3. **Test transaction flows** - Ensure `writeContract` works without `useSwitchChain`

## Related Files

- `frontend/lib/wagmi-config.ts` - Connector wrapper implementation
- `frontend/hooks/use-cancel-poop.ts` - Example of correct usage
- `frontend/hooks/use-deposit-poop.ts` - Example of correct usage
- `frontend/hooks/use-approve-usdc.ts` - Example of correct usage
- `frontend/blockchain/config.ts` - Chain configuration

## Summary

**Remember:** This project uses Farcaster Mini App connector which does NOT implement `getChainId()`. Always:
- Use `APP_CONFIG.DEFAULT_CHAIN.id` for chain IDs
- Never use `useSwitchChain` hook
- Never access `chainId` from `useAccount()`
- The wrapper in `wagmi-config.ts` handles everything else

