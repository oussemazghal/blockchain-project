// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Gestion d'encheres sur la blockchain
/// @notice Un vendeur met un article en vente avec une enchere minimale et une duree fixe.
contract Auction {
    struct AuctionItem {
        address seller;          // vendeur
        string itemName;         // nom de l'article
        string description;      // description courte
        uint256 minPrice;        // enchere minimale (en wei)
        uint256 endTime;         // date de fin (timestamp)
        address highestBidder;   // meilleur encherisseur
        uint256 highestBid;      // meilleure offre (en wei)
        bool ended;              // enchere cloturee ?
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

    /// @notice Cree une enchere pour un article
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
