import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createServer as createHttpServer } from "node:http";

// Render known fixtures without opening a browser or sending any transaction.
const transport = createHttpServer();
const server = await createServer({
  server: { middlewareMode: true, hmr: { server: transport }, watch: null },
  appType: "custom",
});
globalThis.window = {
  location: { origin: "http://localhost:5173", pathname: "/", hash: "#/" },
};
const noop = () => {};
try {
  const load = async (path) =>
    (await server.ssrLoadModule(`/src/${path}.jsx`)).default;
  const render = (Component, props) =>
    renderToStaticMarkup(React.createElement(Component, props));
  const App = await load("App");
  for (const [hash, expected] of [
    ["#/", "Votre prochaine trouvaille"],
    ["#/creer", "Créer l&#x27;enchère"],
    ["#/compte", "Votre portefeuille vous ouvre les portes"],
    ["#/verifier", "Vérifier la signature"],
  ]) {
    window.location.hash = hash;
    assert.ok(
      render(App).includes(expected),
      `Route ${hash} did not render its content`,
    );
  }
  const auction = {
    id: 0,
    itemName: "Vélo d’essai",
    description: "Une pièce de test",
    seller: "0x0000000000000000000000000000000000000001",
    highestBidder: "0x0000000000000000000000000000000000000000",
    highestBid: 0n,
    minPrice: 10n ** 18n,
    endTime: 2000,
    ended: false,
    imageURI: "",
    imageHash: "0x" + "0".repeat(64),
  };
  const AuctionList = await load("components/AuctionList");
  assert.match(
    render(AuctionList, {
      auctions: [],
      loading: false,
      now: 1000,
      onCreate: noop,
    }),
    /Créer la première enchère/,
  );
  assert.match(
    render(AuctionList, { auctions: [auction], loading: false, now: 1000 }),
    /Vélo d’essai/,
  );
  const AuctionDetail = await load("components/AuctionDetail");
  assert.match(
    render(AuctionDetail, {
      auction,
      now: 1000,
      account: auction.seller,
      canWrite: true,
    }),
    /vous ne pouvez pas enchérir/,
  );
  assert.match(
    render(AuctionDetail, { auction, now: 2001, canWrite: false }),
    /Clôturer l’enchère/,
  );
  const dialog = await load("components/ExperienceDialog");
  const wallet = {
    account: null,
    metaMaskInstalled: false,
    wrongNetwork: false,
    connecting: false,
  };
  assert.match(
    render(dialog, { kind: "wallet", wallet }),
    /MetaMask n’est pas disponible/,
  );
  assert.match(
    render(dialog, {
      kind: "wallet",
      wallet: { ...wallet, metaMaskInstalled: true },
    }),
    /Connecter MetaMask/,
  );
  const MyAccount = await load("components/MyAccount");
  assert.match(
    render(MyAccount, {
      account: auction.seller,
      auctions: [auction],
      now: 1000,
      canWrite: true,
    }),
    /Mon profil de vendeur/,
  );
  const connectedWallet = {
    ...wallet,
    metaMaskInstalled: true,
    account: auction.seller,
    balance: 1000n * 10n ** 18n,
  };
  const connectedDialog = render(dialog, {
    kind: "wallet",
    wallet: connectedWallet,
  });
  assert.match(connectedDialog, /Changer de compte/);
  assert.match(connectedDialog, /Se déconnecter/);
  const pendingDialog = render(dialog, {
    kind: "wallet",
    wallet: connectedWallet,
    busy: true,
  });
  const signOutButton = [
    ...pendingDialog.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g),
  ].find((match) => match[2].includes("Se déconnecter"));
  assert.ok(
    signOutButton?.[1].includes('disabled=""'),
    "Sign-out must wait for an active transaction",
  );

  // Only account/chain reads are allowed here; no transaction or signature is sent.
  const bidder = "0x0000000000000000000000000000000000000002";
  window.ethereum = {
    request: async ({ method }) => {
      if (method === "eth_accounts") return [bidder];
      if (method === "eth_chainId") return "0x539";
      throw new Error(`Unexpected wallet method: ${method}`);
    },
  };
  const { getAccountSigner } = await server.ssrLoadModule(
    "/src/lib/blockchain.js",
  );
  await assert.rejects(
    getAccountSigner(auction.seller),
    /compte MetaMask a changé/,
  );
  const signer = await getAccountSigner(bidder);
  try {
    assert.equal(await signer.getAddress(), bidder);
  } finally {
    signer.provider.destroy();
  }
  delete window.ethereum;
  console.log(
    "16 checks passed: page rendering, wallet controls, pending transactions and selected-account signers.",
  );
} finally {
  await server.close();
  delete globalThis.window;
}
