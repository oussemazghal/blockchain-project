// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Auction.sol";

/// @dev Contrat utilisé UNIQUEMENT dans les tests : un vendeur qui refuse les ETH
///      envoyés directement, pour vérifier que la clôture ne reste pas bloquée.
contract RejectingSeller {
    Auction public immutable auction;
    bool public acceptPayments;

    constructor(Auction _auction) {
        auction = _auction;
    }

    function create(uint256 minPrice, uint256 duration) external returns (uint256) {
        return auction.createAuction("Article test", "Vendeur contrat", "", bytes32(0), minPrice, duration);
    }

    function enablePayments() external {
        acceptPayments = true;
    }

    function withdrawFromAuction() external {
        auction.withdraw();
    }

    receive() external payable {
        require(acceptPayments, "Paiement refuse");
    }
}
