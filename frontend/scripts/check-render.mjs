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
  console.log(
    "11 render checks passed: routes, empty and populated catalogue, seller, closing, wallets and account.",
  );
} finally {
  await server.close();
  delete globalThis.window;
}
