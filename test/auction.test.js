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

contract("Auction", (accounts) => {
  const [seller, alice, bob] = accounts;
  const MIN = toBN(toWei("1", "ether"));
  const ONE_HOUR = 3600;
  let auction;

  beforeEach(async () => {
    auction = await Auction.new();
  });

  describe("Creation (F1)", () => {
    it("enregistre l'article, le vendeur, le prix minimal et la date de fin", async () => {
      const tx = await auction.createAuction("Montre", "Montre ancienne", MIN, ONE_HOUR, { from: seller });
      assert.equal((await auction.auctionCount()).toString(), "1");
    });

    it("refuse un nom vide, un prix minimal nul ou une duree nulle", async () => {
      await expectRevert(auction.createAuction("", "", MIN, ONE_HOUR), "Nom de l'article obligatoire");
      await expectRevert(auction.createAuction("Montre", "", 0, ONE_HOUR), "Le prix minimal doit etre > 0");
      await expectRevert(auction.createAuction("Montre", "", MIN, 0), "La duree doit etre > 0");
    });
  });

  describe("Encherir (F2)", () => {
    let id;
    beforeEach(async () => {
      const tx = await auction.createAuction("Montre", "", MIN, ONE_HOUR, { from: seller });
      id = 0;
    });

    it("refuse une premiere offre inferieure au prix minimal", async () => {
      await expectRevert(auction.bid(id, { from: alice, value: toWei("0.5", "ether") }), "Offre inferieure au prix minimal");
    });

    it("refuse que le vendeur encherisse sur sa propre enchere", async () => {
      await expectRevert(auction.bid(id, { from: seller, value: MIN }), "Le vendeur ne peut pas encherir");
    });
  });
});
