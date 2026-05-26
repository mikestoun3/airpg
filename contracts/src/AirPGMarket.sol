// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * AirPG Marketplace — atomic split on every purchase.
 * Buyer calls buy(listingId, sellerAddress) with msg.value = price.
 * Contract instantly forwards (100 - feeBps/100)% to seller and feeBps/100% to treasury.
 * Emits Purchase so the game server can verify and finalise the DB record.
 */
contract AirPGMarket {
    address public treasury;
    address public owner;
    uint256 public feeBps = 500; // 5%

    event Purchase(
        string  listingId,
        address indexed buyer,
        address indexed seller,
        uint256 totalAmount,
        uint256 sellerAmount,
        uint256 feeAmount
    );

    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event FeeBpsUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event OwnershipTransferred(address oldOwner, address newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        owner = msg.sender;
    }

    function buy(string calldata listingId, address payable seller) external payable {
        require(msg.value > 0, "No payment sent");
        require(seller != address(0), "Invalid seller address");
        require(seller != msg.sender, "Cannot buy your own listing");

        uint256 fee = (msg.value * feeBps) / 10000;
        uint256 sellerAmount = msg.value - fee;

        (bool sellerOk,) = seller.call{value: sellerAmount}("");
        require(sellerOk, "Seller transfer failed");

        (bool treasuryOk,) = payable(treasury).call{value: fee}("");
        require(treasuryOk, "Treasury transfer failed");

        emit Purchase(listingId, msg.sender, seller, msg.value, sellerAmount, fee);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee capped at 10%");
        emit FeeBpsUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
