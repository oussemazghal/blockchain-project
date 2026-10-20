const Auction = artifacts.require("Auction");
const { toBN, toWei } = web3.utils;

async function expectRevert(promise, expectedMessage) {
  try {
    await promise;
  } catch (err) {
    assert.include(err.message, expectedMessage, Message inattendu : );
    return;
  }
  assert.fail(La transaction aurait du echouer avec "");
}

async function increaseTime(seconds) {
  const send = (method, params = []) =>
    new Promise((resolve, reject) =>
      web3.currentProvider.send(
        { jsonrpc: "2.0", method, params, id: Date.now() },
        (err, res) => (err ? reject(err) : resolve(res))
      )
    );
  await send("evm_increaseTime", [seconds]);
  await send("evm_mine");
}

contract("Auction", (accounts) => {
  const [seller, alice, bob, carol] = accounts;
  const MIN = toBN(toWei("1", "ether"));
  const ONE_HOUR = 3600;
  let auction;

  beforeEach(async () => {
    auction = await Auction.new();
  });

  describe("Cycle complet: encheres, retrait et fin", () => {
    it("permet a l'ancien encherisseur de retirer ses fonds apres surenchere", async () => {
      await auction.createAuction("Montre", "", MIN, ONE_HOUR, { from: seller });
      await auction.bid(0, { from: alice, value: toWei("1.2", "ether") });
      await auction.bid(0, { from: bob, value: toWei("1.5", "ether") });

      assert.equal((await auction.pendingReturns(alice)).toString(), toWei("1.2", "ether"));
      await auction.withdraw({ from: alice });
      assert.equal((await auction.pendingReturns(alice)).toString(), "0");
    });

    it("cloture l'enchere apres expiration et transfert le gain au vendeur", async () => {
      await auction.createAuction("Montre", "", MIN, ONE_HOUR, { from: seller });
      await auction.bid(0, { from: alice, value: toWei("2", "ether") });

      await increaseTime(ONE_HOUR + 10);
      const before = toBN(await web3.eth.getBalance(seller));
      await auction.endAuction(0, { from: carol });
      const after = toBN(await web3.eth.getBalance(seller));

      assert.equal(after.sub(before).toString(), toWei("2", "ether"));
      const a = await auction.getAuction(0);
      assert.isTrue(a.ended);
    });
  });
});
