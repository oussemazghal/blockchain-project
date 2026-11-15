import { useEffect, useMemo, useSyncExternalStore } from "react";
import { CHAIN_ID } from "../config.js";
import { readProvider, switchToGanache } from "../lib/blockchain.js";
import { createWalletSession } from "../lib/walletSession.js";

export function useWallet() {
  const provider = typeof window !== "undefined" ? window.ethereum : undefined;
  const session = useMemo(() => {
    let storage;
    try {
      storage = typeof window !== "undefined" ? window.localStorage : undefined;
    } catch {
      /* Private browser storage may be unavailable. */
    }
    return createWalletSession({
      provider,
      storage,
      readBalance: (address) => readProvider.getBalance(address),
    });
  }, [provider]);
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  useEffect(() => session.start(), [session]);

  return {
    ...state,
    connect: session.connect,
    disconnect: session.disconnect,
    switchAccount: session.switchAccount,
    refreshBalance: session.refreshBalance,
    switchNetwork: switchToGanache,
    wrongNetwork:
      Boolean(state.account) &&
      state.chainId !== null &&
      state.chainId !== CHAIN_ID,
    metaMaskInstalled: Boolean(provider),
  };
}
