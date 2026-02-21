const hre = require("hardhat");

async function main() {
  // PASTE YOUR NEW DEPLOYED ADDRESS HERE
  const CONTRACT_ADDRESS = "0x2f41783a1dd6a7ad55b09aa97ef56d225a8706b0"; 

  const lotto = await hre.ethers.getContractAt("SequentialLotto", CONTRACT_ADDRESS);

  console.log("Buying a ticket...");
  // Buying numbers: 1, 2, 3, 4, 5, 6, 7
  // Price: 0.01 ETH
  const tx = await lotto.buyTicket([1, 2, 3, 4, 5, 6, 7], { 
    value: hre.ethers.parseEther("0.01") 
  });
  
  console.log("Transaction sent! Hash:", tx.hash);
  await tx.wait();
  console.log("✅ Ticket purchased successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});