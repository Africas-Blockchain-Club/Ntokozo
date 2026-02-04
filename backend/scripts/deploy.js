const { ethers, upgrades } = require("hardhat");

async function main() {
  const EthRewardPool = await ethers.getContractFactory("EthRewardPool");
  
  console.log("Deploying EthRewardPool Proxy...");
  
  // This deploys the Proxy and calls initialize()
  const pool = await upgrades.deployProxy(EthRewardPool, [], {
    initializer: "initialize",
    kind: "uups",
  });

  await pool.waitForDeployment();

  console.log("Proxy deployed to:", await pool.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});