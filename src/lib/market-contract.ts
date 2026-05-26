export const AIRPG_MARKET_ABI = [
  "function buy(string listingId, address payable seller) payable",
  "event Purchase(string listingId, address indexed buyer, address indexed seller, uint256 totalAmount, uint256 sellerAmount, uint256 feeAmount)",
] as const;
