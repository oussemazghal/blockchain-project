export function auctionStatus(auction, now = Math.floor(Date.now() / 1000)) {
  return auction.ended
    ? "terminee"
    : now >= auction.endTime
      ? "a-cloturer"
      : "en-cours";
}

const normalize = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
const price = (auction) =>
  auction.highestBid > 0n ? auction.highestBid : auction.minPrice;

export function selectAuctions(
  auctions,
  {
    filter = "all",
    query = "",
    sort = "recent",
    now = Math.floor(Date.now() / 1000),
  } = {},
) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const selected = auctions.filter((auction) => {
    if (filter !== "all" && auctionStatus(auction, now) !== filter)
      return false;
    const searchable = normalize(
      `${auction.itemName} ${auction.description} ${auction.seller}`,
    );
    return terms.every((term) => searchable.includes(term));
  });
  return selected.sort((a, b) => {
    if (sort === "price")
      return price(a) === price(b) ? b.id - a.id : price(a) < price(b) ? -1 : 1;
    if (sort === "ending")
      return (
        Number(a.ended) - Number(b.ended) ||
        a.endTime - b.endTime ||
        b.id - a.id
      );
    return b.id - a.id;
  });
}
