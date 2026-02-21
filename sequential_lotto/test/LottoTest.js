const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Sequential Lotto Simulation", function () {
  async function deployFixture() {
    const [owner, player1] = await ethers.getSigners();

    // 1. Deploy Stable V2 Mock
    const VRFCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");
    // Base fee: 0.25 LINK, Gas price: 1 gwei
    const mockCoordinator = await VRFCoordinatorV2Mock.deploy("250000000000000000", "1000000000");
    await mockCoordinator.waitForDeployment();
    const mockAddr = await mockCoordinator.getAddress();

    // 2. Create Subscription
    const tx = await mockCoordinator.createSubscription();
    const receipt = await tx.wait();
    
    // In V2 Mock, we extract ID from events, but usually it's 1
    const subId = 1; 
    await mockCoordinator.fundSubscription(subId, "100000000000000000000"); // 100 LINK

    // 3. Deploy Lotto
    const Lotto = await ethers.getContractFactory("SequentialLotto");
    const lotto = await Lotto.deploy(subId, mockAddr);
    await lotto.waitForDeployment();
    const lottoAddr = await lotto.getAddress();

    // 4. Add Consumer
    await mockCoordinator.addConsumer(subId, lottoAddr);

    return { lotto, mockCoordinator, player1, lottoAddr };
  }

  it("Should run the lottery", async function () {
    const { lotto, mockCoordinator, player1, lottoAddr } = await deployFixture();

    // Buy Ticket
    await lotto.connect(player1).buyTicket([1, 2, 3, 4, 5, 6, 7], { value: ethers.parseEther("0.01") });

    // Time Travel
    await time.increase(24 * 60 * 60 + 1);

    // Trigger Draw
    const tx = await lotto.performUpkeep("0x");
    const receipt = await tx.wait();

    // V2 Mock uses "RandomWordsRequested" event to get request ID
    // We can usually just assume request ID 1 for the first request
    const requestId = 1;

    // Fulfill (Simulate Chainlink responding)
    // We pass the winning numbers in RAW format.
    // 490 % 49 + 1 = 1, etc.
    await mockCoordinator.fulfillRandomWordsWithOverride(
        requestId, 
        lottoAddr, 
        [490, 491, 492, 493, 494, 495, 496]
    );

    // Check Balance (Winner should get paid)
    const finalBalance = await ethers.provider.getBalance(lottoAddr);
    // 0.01 ETH in. 10% to owner (0.001). 30% to winner (0.003). 
    // Remaining should be 0.006.
    expect(finalBalance).to.equal(ethers.parseEther("0.006"));
    console.log("Success! Balance is 0.006 ETH");
  });
});