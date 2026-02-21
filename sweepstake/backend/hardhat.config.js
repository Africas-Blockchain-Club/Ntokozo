require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades'); // <--- This was missing!
require("dotenv").config();

module.exports = {
  solidity: "0.8.22", // <--- Updated to match your OpenZeppelin version
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "YOUR_ARBISCAN_API_KEY"
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      }
    ]
  },
};