const hre = require("hardhat");

async function main() {
  // 1. CONFIGURATION
  // YOUR HUGE ID GOES HERE (Keep it as a string!)
  const SUBSCRIPTION_ID = "44769072480390935259588832330377142518912163284137685128726980734069279803915"; 

  // NEW: Sepolia VRF Coordinator V2.5 Address
  const SEPOLIA_VRF_COORDINATOR = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";

  console.log("Deploying V2.5 SequentialLotto to Sepolia...");

  const Lotto = await hre.ethers.getContractFactory("SequentialLotto");
  
  // Deploy with the Huge ID
  const lotto = await Lotto.deploy(SUBSCRIPTION_ID, SEPOLIA_VRF_COORDINATOR);

  await lotto.waitForDeployment();

  const address = await lotto.getAddress();
  console.log("✅ V2.5 Contract deployed:", address);
  console.log("👉 Go to vrf.chain.link -> Click ID -> Add Consumer -> Paste Address");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});