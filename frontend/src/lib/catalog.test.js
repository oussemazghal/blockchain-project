import test from "node:test";
import assert from "node:assert/strict";
import { auctionStatus, selectAuctions } from "./catalog.js";

const now = 1000;
const auctions = [
  {
    id: 0,
    itemName: "Vélo de ville",
    description: "Cadre ancien en acier",
    seller: "0xAAA",
    endTime: 1200,
    ended: false,
    minPrice: 5n,
    highestBid: 0n,
  },
  {
    id: 1,
    itemName: "Montre mécanique",
    description: "Acier brossé",
    seller: "0xBBB",
    endTime: 1000,
    ended: false,
    minPrice: 2n,
    highestBid: 9n,
  },
  {
    id: 2,
    itemName: "Appareil photo",
    description: "Objectif vintage",
    seller: "0xCCC",
    endTime: 800,
    ended: true,
    minPrice: 3n,
    highestBid: 0n,
  },
];

test("French search accepts accents, case and words across fields", () => {
  assert.deepEqual(
    selectAuctions(auctions, { query: "  VELO acier  ", now }).map((a) => a.id),
    [0],
  );
  assert.deepEqual(
    selectAuctions(auctions, { query: "mecanique 0xbbb", now }).map(
      (a) => a.id,
    ),
    [1],
  );
  assert.equal(
    selectAuctions(auctions, { query: "vélo montre", now }).length,
    0,
  );
});

test("status filters distinguish expired auctions from those already closed", () => {
  assert.equal(auctionStatus(auctions[1], now), "a-cloturer");
  assert.deepEqual(
    selectAuctions(auctions, { filter: "en-cours", now }).map((a) => a.id),
    [0],
  );
  assert.deepEqual(
    selectAuctions(auctions, { filter: "terminee", now }).map((a) => a.id),
    [2],
  );
  assert.deepEqual(
    selectAuctions(auctions, {
      filter: "a-cloturer",
      query: "montre",
      now,
    }).map((a) => a.id),
    [1],
  );
});

test("price sorting uses the winning bid when present and preserves wei precision", () => {
  assert.deepEqual(
    selectAuctions(auctions, { sort: "price", now }).map((a) => a.id),
    [2, 0, 1],
  );
  const large = [
    { ...auctions[0], id: 0, minPrice: 9007199254740993n },
    { ...auctions[0], id: 1, minPrice: 9007199254740992n },
  ];
  assert.deepEqual(
    selectAuctions(large, { sort: "price", now }).map((a) => a.id),
    [1, 0],
  );
});

test("soonest ending prioritizes auctions that still need closing", () => {
  assert.deepEqual(
    selectAuctions(auctions, { sort: "ending", now }).map((a) => a.id),
    [1, 0, 2],
  );
});

test("sorting and filtering leave the source collection unchanged", () => {
  const snapshot = [...auctions];
  assert.deepEqual(
    selectAuctions(auctions, { now }).map((a) => a.id),
    [2, 1, 0],
  );
  assert.deepEqual(auctions, snapshot);
});
