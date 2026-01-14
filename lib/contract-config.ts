// NFT Contract Configuration for Arc Testnet
export const NFT_CONTRACT_CONFIG = {
  address: '0xb1b4570aa453ea000864958e94166dd837069866', // Updated with deployed contract address on Arc Testnet
  abi: [
    // mintWish function
    'function mintWish(address to, string memory wishText, string memory dateKey) external returns (uint256)',
    // Get wishes by address
    'function getWishesByAddress(address owner) external view returns (tuple(uint256 tokenId, string wishText, string dateKey, uint256 timestamp)[])',
    // Check if minted today
    'function hasMintedToday(address user, string memory dateKey) external view returns (bool)',
    // Get token URI
    'function tokenURI(uint256 tokenId) external view returns (string)',
    // Events
    'event WishMinted(address indexed to, uint256 indexed tokenId, string wishText, string dateKey, uint256 timestamp)',
  ],
}

export function isContractDeployed(): boolean {
  return NFT_CONTRACT_CONFIG.address !== '0x0000000000000000000000000000000000000000'
}

export type Wish = {
  tokenId: number
  wishText: string
  dateKey: string
  timestamp: number
}

// WISH Token contract configuration
export const WISH_TOKEN_CONFIG = {
  address: '0x7adf36ef2f3775096298101a6e88e44c5ada4b95', // Replace with deployed WISH token contract address
  abi: [
    // ERC20 Standard
    'function balanceOf(address account) external view returns (uint256)',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function decimals() external view returns (uint8)',
    'function symbol() external view returns (string)',
    'function name() external view returns (string)',
    // WISH Token Specific
    'function swapUSDCForWISH(uint256 usdcAmount) external',
    'function EXCHANGE_RATE() external view returns (uint256)',
    'function usdcTokenAddress() external view returns (address)',
    'function getContractWISHBalance() external view returns (uint256)',
    'function getContractUSDCBalance() external view returns (uint256)',
    'function claimSocialReward(string memory taskId, uint256 amount) external',
    'function hasClaimedTask(address user, string memory taskId) external view returns (bool)',
    'function socialTasksClaimed(address user, string memory taskId) external view returns (bool)',
    // Events
    'event TokensSwapped(address indexed user, uint256 usdcAmount, uint256 wishAmount)',
    'event SocialRewardClaimed(address indexed user, uint256 amount, string taskId)',
  ],
  decimals: 18,
}

export function isWishTokenDeployed(): boolean {
  return WISH_TOKEN_CONFIG.address !== '0x0000000000000000000000000000000000000000'
}

// USDC configuration
export const USDC_TOKEN_CONFIG = {
  address: '0x3600000000000000000000000000000000000000', // USDC on Arc Testnet (native gas token)
  decimals: 6,
}

export const ARC_TESTNET_CONFIG = {
  chainId: 5042002,
  chainName: 'Arc Testnet',
  rpcUrl: 'https://sepolia-api.lisk.com',
  blockExplorer: 'https://sepolia-blockscout.lisk.com',
  nativeCurrency: {
    name: 'Arc',
    symbol: 'ARC',
    decimals: 18,
  },
}
