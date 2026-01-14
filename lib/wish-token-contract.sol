// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WishToken
 * @dev ERC20 Token for WISH on Arc Testnet
 * This token can be swapped with USDC
 */
contract WishToken is ERC20, Ownable {
    // Decimals for the token
    uint8 private constant _decimals = 18;
    
    // Exchange rate: 1 USDC = 100 WISH
    uint256 public constant EXCHANGE_RATE = 100;
    
    // USDC token address on Arc Testnet
    address public usdcTokenAddress;
    
    // Mapping: user address => task ID => claimed status
    mapping(address => mapping(string => bool)) public socialTasksClaimed;
    
    event TokensSwapped(address indexed user, uint256 usdcAmount, uint256 wishAmount);
    event USDCAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event SocialRewardClaimed(address indexed user, uint256 amount, string taskId);
    
    constructor(address _usdcTokenAddress) ERC20("Wish Token", "WISH") Ownable(msg.sender) {
        usdcTokenAddress = _usdcTokenAddress;
        // Mint initial supply to contract for swapping (1 million WISH)
        _mint(address(this), 1_000_000 * 10**_decimals);
    }
    
    /**
     * @dev Update USDC token address (only owner)
     */
    function setUSDCAddress(address _usdcTokenAddress) external onlyOwner {
        require(_usdcTokenAddress != address(0), "Invalid USDC address");
        address oldAddress = usdcTokenAddress;
        usdcTokenAddress = _usdcTokenAddress;
        emit USDCAddressUpdated(oldAddress, _usdcTokenAddress);
    }
    
    /**
     * @dev Swap USDC for WISH tokens
     * User must approve this contract to spend their USDC first
     * @param usdcAmount Amount of USDC to swap (with 6 decimals)
     */
    function swapUSDCForWISH(uint256 usdcAmount) external {
        require(usdcAmount > 0, "Amount must be greater than 0");
        
        // Calculate WISH amount (1 USDC = 100 WISH)
        // USDC has 6 decimals, WISH has 18 decimals
        uint256 wishAmount = usdcAmount * EXCHANGE_RATE * 10**12; // Convert decimals
        
        require(balanceOf(address(this)) >= wishAmount, "Insufficient WISH in contract");
        
        // Transfer USDC from user to contract
        IERC20 usdc = IERC20(usdcTokenAddress);
        require(usdc.transferFrom(msg.sender, address(this), usdcAmount), "USDC transfer failed");
        
        // Transfer WISH to user
        _transfer(address(this), msg.sender, wishAmount);
        
        emit TokensSwapped(msg.sender, usdcAmount, wishAmount);
    }
    
    /**
     * @dev Swap WISH tokens for USDC
     * User must approve this contract to spend their WISH first
     * @param wishAmount Amount of WISH to swap (with 18 decimals)
     */
    function swapWISHForUSDC(uint256 wishAmount) external {
        require(wishAmount > 0, "Amount must be greater than 0");
        
        // Calculate USDC amount (100 WISH = 1 USDC)
        // WISH has 18 decimals, USDC has 6 decimals
        uint256 usdcAmount = wishAmount / (EXCHANGE_RATE * 10**12); // Convert decimals
        
        require(usdcAmount > 0, "WISH amount too small");
        
        IERC20 usdc = IERC20(usdcTokenAddress);
        require(usdc.balanceOf(address(this)) >= usdcAmount, "Insufficient USDC in contract");
        
        // Transfer WISH from user to contract
        _transfer(msg.sender, address(this), wishAmount);
        
        // Transfer USDC to user
        require(usdc.transfer(msg.sender, usdcAmount), "USDC transfer failed");
        
        emit TokensSwapped(msg.sender, usdcAmount, wishAmount);
    }
    
    /**
     * @dev Mint additional WISH tokens to contract (only owner)
     */
    function mintToContract(uint256 amount) external onlyOwner {
        _mint(address(this), amount);
    }
    
    /**
     * @dev Withdraw USDC from contract (only owner)
     */
    function withdrawUSDC(uint256 amount) external onlyOwner {
        IERC20 usdc = IERC20(usdcTokenAddress);
        require(usdc.transfer(owner(), amount), "USDC withdrawal failed");
    }
    
    /**
     * @dev Get contract's USDC balance
     */
    function getContractUSDCBalance() external view returns (uint256) {
        IERC20 usdc = IERC20(usdcTokenAddress);
        return usdc.balanceOf(address(this));
    }
    
    /**
     * @dev Get contract's WISH balance
     */
    function getContractWISHBalance() external view returns (uint256) {
        return balanceOf(address(this));
    }
    
    /**
     * @dev Claim social task rewards
     * @param taskId Unique identifier for the task being claimed
     * @param amount Amount of WISH tokens to claim (with 18 decimals)
     * Users can claim rewards for completing social tasks, but only once per task
     */
    function claimSocialReward(string memory taskId, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(!socialTasksClaimed[msg.sender][taskId], "Task already claimed");
        require(balanceOf(address(this)) >= amount, "Insufficient WISH in contract");
        
        // Mark task as claimed for this user
        socialTasksClaimed[msg.sender][taskId] = true;
        
        // Transfer WISH from contract to user
        _transfer(address(this), msg.sender, amount);
        
        emit SocialRewardClaimed(msg.sender, amount, taskId);
    }
    
    /**
     * @dev Check if a user has claimed a specific task
     * @param user Address of the user
     * @param taskId Unique identifier for the task
     * @return bool Whether the task has been claimed
     */
    function hasClaimedTask(address user, string memory taskId) external view returns (bool) {
        return socialTasksClaimed[user][taskId];
    }
}
