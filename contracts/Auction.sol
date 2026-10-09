// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Auction {
    struct AuctionItem {
        address seller;
        string itemName;
        string description;
        uint256 minPrice;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool ended;
    }

    uint256 public auctionCount;
    mapping(uint256 => AuctionItem) private auctions;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        string itemName,
        uint256 minPrice,
        uint256 endTime
    );

    function createAuction(
        string calldata itemName,
        string calldata description,
        uint256 minPrice,
        uint256 duration
    ) external returns (uint256 auctionId) {
        require(bytes(itemName).length > 0, "Nom de l'article obligatoire");
        require(minPrice > 0, "Le prix minimal doit etre > 0");
        require(duration > 0, "La duree doit etre > 0");

        auctionId = auctionCount;
        auctionCount++;

        AuctionItem storage a = auctions[auctionId];
        a.seller = msg.sender;
        a.itemName = itemName;
        a.description = description;
        a.minPrice = minPrice;
        a.endTime = block.timestamp + duration;

        emit AuctionCreated(auctionId, msg.sender, itemName, minPrice, a.endTime);
    }
}
