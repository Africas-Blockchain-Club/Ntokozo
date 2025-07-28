// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;


contract Ownable {
    address private owner;
    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner can perform this action.");
        _;
    }
}


contract VotingSystem is Ownable {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    

    mapping(uint => Candidate) private candidates;
    mapping(address => bool) private voters;
    
    uint private candidateCount = 0;
    
    function addCandidate(string calldata name) external onlyOwner {
        candidateCount++;
        candidates[candidateCount] = Candidate(candidateCount, name, 0);
    }

    function vote(uint candidateId) external {
        require(!voters[msg.sender], "You have already voted.");
        require(candidateId > 0 && candidateId <= candidateCount, "Invalid candidate.");

        voters[msg.sender] = true;
        candidates[candidateId].voteCount++;
    }

    function getCandidate(uint candidateId) public view returns (string memory name, uint voteCount) {
        require(candidateId > 0 && candidateId <= candidateCount, "Candidate does not exist.");
        Candidate memory c = candidates[candidateId];
        return (c.name, c.voteCount);
    }

    function getTotalCandidates() public view returns (uint) {
        return candidateCount;
    }
}
