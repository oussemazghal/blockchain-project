import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createWalletSession, SIGNED_OUT_KEY } from "./walletSession.js";

const SELLER = "0x0000000000000000000000000000000000000001";
const BIDDER = "0x0000000000000000000000000000000000000002";
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

class Wallet extends EventEmitter {
  accounts = [SELLER];
  chain = "0x539";
  calls = [];
  handlers = {};
  async request(request) {
    this.calls.push(request);
    if (this.handlers[request.method])
      return this.handlers[request.method](request);
    if (
      request.method === "eth_accounts" ||
      request.method === "eth_requestAccounts"
    )
      return [...this.accounts];
    if (request.method === "eth_chainId") return this.chain;
    if (request.method === "wallet_revokePermissions") {
      this.accounts = [];
      this.emit("accountsChanged", []);
      return null;
    }
    if (request.method === "wallet_requestPermissions") return [];
    throw new Error(`Unexpected RPC ${request.method}`);
  }
}

function fixture(options = {}) {
  const provider = options.provider || new Wallet();
  const values = new Map();
  const storage = options.storage || {
    getItem: (key) => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const session = createWalletSession({
    provider,
    storage,
    readBalance:
      options.readBalance ||
      (async (account) => (account === SELLER ? 100n : 50n)),
  });
  const stop = session.start();
  return { provider, storage, values, session, stop };
}

test("restores the wallet and follows account and network changes", async () => {
  const { session, provider, stop } = fixture();
  try {
    await tick();
    assert.equal(session.getSnapshot().account, SELLER);
    assert.equal(session.getSnapshot().balance, 100n);
    provider.accounts = [BIDDER];
    provider.emit("accountsChanged", [BIDDER]);
    assert.equal(session.getSnapshot().balance, null);
    await tick();
    assert.equal(session.getSnapshot().account, BIDDER);
    assert.equal(session.getSnapshot().balance, 50n);
    provider.emit("chainChanged", "0x1");
    assert.equal(session.getSnapshot().chainId, 1);
  } finally {
    stop();
  }
});

test("sign-out clears identity immediately and ignores wallet events while revoking", async () => {
  const { session, provider, values, stop } = fixture();
  try {
    await tick();
    const revoke = deferred();
    provider.handlers.wallet_revokePermissions = () => revoke.promise;
    const signingOut = session.disconnect();
    assert.equal(session.getSnapshot().account, null);
    assert.equal(session.getSnapshot().balance, null);
    assert.equal(session.getSnapshot().chainId, null);
    assert.equal(values.get(SIGNED_OUT_KEY), "true");
    provider.emit("accountsChanged", [SELLER]);
    assert.equal(session.getSnapshot().account, null);
    revoke.resolve(null);
    await signingOut;
    assert.equal(session.getSnapshot().disconnecting, false);
  } finally {
    stop();
  }
});

test("sign-out survives reload even when a wallet cannot revoke permissions", async () => {
  const first = fixture();
  first.provider.handlers.wallet_revokePermissions = () => {
    throw { code: -32601 };
  };
  await tick();
  await first.session.disconnect();
  first.stop();
  const before = first.provider.calls.length;
  const second = fixture({ provider: first.provider, storage: first.storage });
  try {
    await tick();
    second.provider.emit("accountsChanged", [SELLER]);
    assert.equal(second.session.getSnapshot().account, null);
    assert.equal(second.provider.calls.length, before);
    second.provider.handlers.wallet_requestPermissions = () => {
      second.provider.accounts = [BIDDER];
      return [];
    };
    assert.equal(await second.session.connect(), true);
    await tick();
    assert.equal(second.session.getSnapshot().account, BIDDER);
    assert.equal(second.session.getSnapshot().balance, 50n);
    assert.equal(second.storage.getItem(SIGNED_OUT_KEY), undefined);
    assert.ok(
      second.provider.calls.some(
        (call) => call.method === "wallet_requestPermissions",
      ),
    );
  } finally {
    second.stop();
  }
});

test("switching accounts prompts for permissions and uses the current selected account", async () => {
  const { session, provider, stop } = fixture();
  try {
    await tick();
    provider.handlers.wallet_requestPermissions = (request) => {
      assert.deepEqual(request.params, [{ eth_accounts: {} }]);
      provider.accounts = [BIDDER];
      provider.emit("accountsChanged", [BIDDER]);
      return [];
    };
    assert.equal(await session.switchAccount(), true);
    await tick();
    assert.equal(session.getSnapshot().account, BIDDER);
    assert.equal(session.getSnapshot().balance, 50n);
    assert.equal(session.getSnapshot().connecting, false);
  } finally {
    stop();
  }
});

test("cancelling the account selector keeps the current session usable", async () => {
  const { session, provider, stop } = fixture();
  try {
    await tick();
    provider.handlers.wallet_requestPermissions = () => {
      throw { code: 4001 };
    };
    await assert.rejects(
      session.switchAccount(),
      (error) => error.code === 4001,
    );
    assert.equal(session.getSnapshot().account, SELLER);
    assert.equal(session.getSnapshot().balance, 100n);
    assert.equal(session.getSnapshot().connecting, false);
  } finally {
    stop();
  }
});

test("a delayed restore cannot reconnect an explicitly signed-out user", async () => {
  const provider = new Wallet();
  const restore = deferred();
  provider.handlers.eth_accounts = () => restore.promise;
  const { session, stop } = fixture({ provider });
  try {
    await session.disconnect();
    restore.resolve([SELLER]);
    await tick();
    assert.equal(session.getSnapshot().account, null);
  } finally {
    stop();
  }
});

test("an unfinished connection cannot undo a later sign-out", async () => {
  const { session, provider, stop } = fixture();
  try {
    await tick();
    const request = deferred();
    provider.handlers.eth_requestAccounts = () => request.promise;
    const connecting = session.connect();
    await session.disconnect();
    provider.accounts = [SELLER];
    request.resolve([SELLER]);
    assert.equal(await connecting, false);
    assert.equal(session.getSnapshot().account, null);
  } finally {
    stop();
  }
});

test("a late seller balance cannot overwrite the bidder balance", async () => {
  const sellerBalance = deferred();
  const { session, provider, stop } = fixture({
    readBalance: (account) =>
      account === SELLER ? sellerBalance.promise : Promise.resolve(50n),
  });
  try {
    await tick();
    provider.emit("accountsChanged", [BIDDER]);
    await tick();
    sellerBalance.resolve(100n);
    await tick();
    assert.equal(session.getSnapshot().account, BIDDER);
    assert.equal(session.getSnapshot().balance, 50n);
  } finally {
    stop();
  }
});

test("account events during startup win over an older account snapshot", async () => {
  const provider = new Wallet();
  const restore = deferred();
  provider.handlers.eth_accounts = () => restore.promise;
  const { session, stop } = fixture({ provider });
  try {
    provider.emit("accountsChanged", [BIDDER]);
    restore.resolve([SELLER]);
    await tick();
    assert.equal(session.getSnapshot().account, BIDDER);
    assert.equal(session.getSnapshot().chainId, 1337);
  } finally {
    stop();
  }
});

test("simultaneous connect clicks produce only one account request", async () => {
  const { session, provider, stop } = fixture();
  try {
    await tick();
    const request = deferred();
    provider.handlers.eth_requestAccounts = () => request.promise;
    const first = session.connect();
    assert.equal(await session.connect(), false);
    request.resolve([SELLER]);
    await first;
    assert.equal(
      provider.calls.filter((call) => call.method === "eth_requestAccounts")
        .length,
      1,
    );
  } finally {
    stop();
  }
});

test("storage restrictions do not prevent local sign-out", async () => {
  const unavailable = () => {
    throw new Error("Storage blocked");
  };
  const { session, provider, stop } = fixture({
    storage: {
      getItem: unavailable,
      setItem: unavailable,
      removeItem: unavailable,
    },
  });
  try {
    await tick();
    await session.disconnect();
    provider.emit("accountsChanged", [SELLER]);
    assert.equal(session.getSnapshot().account, null);
  } finally {
    stop();
  }
});

test("cleanup removes wallet listeners and ignores pending replies", async () => {
  const provider = new Wallet();
  const restore = deferred();
  provider.handlers.eth_accounts = () => restore.promise;
  const { session, stop } = fixture({ provider });
  stop();
  restore.resolve([SELLER]);
  await tick();
  assert.equal(provider.listenerCount("accountsChanged"), 0);
  assert.equal(provider.listenerCount("chainChanged"), 0);
  assert.equal(provider.listenerCount("disconnect"), 0);
  assert.equal(session.getSnapshot().account, null);
});
