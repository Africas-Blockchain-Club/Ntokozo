// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract EthRewardPool is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    // Roles
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant AUTOMATION_ROLE = keccak256("AUTOMATION_ROLE");

    uint256 public roundId;
    uint256 public roundStart;
    uint256 public constant ROUND_DURATION = 10 minutes;
    uint256 public constant MIN_CONTRIBUTION = 0.01 ether;

    address payable[] public participants;
    mapping(address => bool) public hasJoined;
    mapping(uint256 => address payable) public rewardHistory;

    event ParticipantJoined(address indexed participant, uint256 amount);
    event RewardDistributed(address indexed recipient, uint256 amount, uint256 roundId);
    event RoundReset(uint256 roundId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(AUTOMATION_ROLE, msg.sender);

        roundId = 1;
        roundStart = block.timestamp;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    function joinPool() external payable nonReentrant {
        // If roundStart is 0 (The 1970 Bug), this resets it automatically
        if (roundStart == 0) {
            roundStart = block.timestamp;
        }

        require(block.timestamp < roundStart + ROUND_DURATION, "Round closed");
        require(!hasJoined[msg.sender], "Already joined");
        require(msg.value >= MIN_CONTRIBUTION, "Min 0.01 ETH");

        participants.push(payable(msg.sender));
        hasJoined[msg.sender] = true;
        emit ParticipantJoined(msg.sender, msg.value);
    }

    function distributeReward() external nonReentrant {
        // REMOVED THE "No participants" REQUIREMENT
        // Instead, if empty, we just restart the timer.
        if (participants.length == 0) {
            roundStart = block.timestamp;
            emit RoundReset(roundId);
            return; 
        }

        require(block.timestamp >= roundStart + ROUND_DURATION, "Round not finished");

        uint256 index = uint256(keccak256(abi.encodePacked(block.prevrandao, participants.length))) % participants.length;
        address payable winner = participants[index];
        uint256 prize = address(this).balance;
        
        (bool success, ) = winner.call{value: prize}("");
        require(success, "Transfer failed");

        rewardHistory[roundId] = winner;
        emit RewardDistributed(winner, prize, roundId);

        delete participants;
        roundStart = block.timestamp;
        roundId++;
    }
}