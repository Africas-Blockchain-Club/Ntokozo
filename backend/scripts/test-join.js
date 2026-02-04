const { ethers } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"; 
  const [signer] = await ethers.getSigners();

  const EthRewardPoolFactory = await ethers.getContractFactory("EthRewardPool");
  const pool = EthRewardPoolFactory.attach(PROXY_ADDRESS).connect(signer);

  console.log("Checking current pool balance...");
  
  // Use the provider to check balance instead of a contract function
  let balance = await ethers.provider.getBalance(PROXY_ADDRESS);
  console.log("Initial balance:", ethers.formatEther(balance), "ETH");

  console.log("\nJoining pool with 0.02 ETH...");
  const tx = await pool.joinPool({ value: ethers.parseEther("0.02") });
  await tx.wait();

  balance = await ethers.provider.getBalance(PROXY_ADDRESS);
  console.log("Success! New pool balance:", ethers.formatEther(balance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});