const { ethers, upgrades } = require("hardhat");

async function main() {
  const EthRewardPool = await ethers.getContractFactory("EthRewardPool");
  
  console.log("Deploying EthRewardPool Proxy...");
  
  try {
    // Get current gas prices and add buffer
    const provider = ethers.provider;
    const feeData = await provider.getFeeData();
    
    let deployOptions = {
      initializer: "initialize",
      kind: "uups",
    };

    // For EIP-1559 networks (Arbitrum Sepolia, etc.)
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      const maxFeePerGas = (feeData.maxFeePerGas * BigInt(120)) / BigInt(100);  // Add 20% buffer
      const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas * BigInt(120)) / BigInt(100);
      
      deployOptions.maxFeePerGas = maxFeePerGas;
      deployOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
      
      console.log("Using EIP-1559 gas pricing:");
      console.log("Max Fee Per Gas:", ethers.formatUnits(maxFeePerGas, "gwei"), "gwei");
      console.log("Max Priority Fee Per Gas:", ethers.formatUnits(maxPriorityFeePerGas, "gwei"), "gwei");
    }
    
    // This deploys the Proxy and calls initialize()
    const pool = await upgrades.deployProxy(EthRewardPool, [], deployOptions);

    await pool.waitForDeployment();

    const proxyAddress = await pool.getAddress();
    console.log("✅ Proxy deployed to:", proxyAddress);
    console.log("\n🔍 View on Arbiscan:");
    console.log(`   https://sepolia.arbiscan.io/address/${proxyAddress}`);
    console.log("\n📝 To verify your contract, run:");
    console.log(`   npx hardhat verify --network sepolia ${proxyAddress}`);
  } catch (error) {
    // If it's a gas-related error, provide helpful guidance
    if (error.message.includes("base fee") || error.message.includes("max fee per gas")) {
      console.error("❌ Gas pricing error. Network gas prices may be too high.");
      console.error("   Try again in a few moments or increase your gas limit in hardhat.config.js");
    } else {
      console.error("❌ Deployment failed:", error);
    }
    process.exitCode = 1;
  }
}

main();