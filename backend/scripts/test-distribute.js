const { ethers, network } = require("hardhat");

async function main() {
  const PROXY_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"; 
  const [signer] = await ethers.getSigners();
  const EthRewardPoolFactory = await ethers.getContractFactory("EthRewardPool");
  const pool = EthRewardPoolFactory.attach(PROXY_ADDRESS).connect(signer);

  console.log("--- Automation Simulation ---");

  // 1. Fast-forward 11 minutes (660 seconds)
  console.log("Fast-forwarding time by 11 minutes...");
  await network.provider.send("evm_increaseTime", [660]);
  await network.provider.send("evm_mine"); // Mine a new block to apply the time change

  // 2. Check who is in the pool
  const participants = await pool.getParticipants();
  console.log("Number of participants waiting:", participants.length);

  if (participants.length === 0) {
    console.log("Error: No participants to pay out! Run test-join.js first.");
    return;
  }

  // 3. Trigger the distribution (You have AUTOMATION_ROLE as the deployer)
  console.log("Triggering distributeReward()...");
  const tx = await pool.distributeReward();
  const receipt = await tx.wait();

  // 4. Find the RewardDistributed event in the logs
  const event = receipt.logs.map(log => {
    try { return pool.interface.parseLog(log); } catch (e) { return null; }
  }).find(e => e && e.name === "RewardDistributed");

  if (event) {
    console.log(`\n🏆 WINNER PICKED!`);
    console.log(`Address: ${event.args.recipient}`);
    console.log(`Prize: ${ethers.formatEther(event.args.amount)} ETH`);
    console.log(`Round ID: ${event.args.roundId}`);
  }

  const finalBalance = await ethers.provider.getBalance(PROXY_ADDRESS);
  console.log("\nPool balance after payout:", ethers.formatEther(finalBalance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});