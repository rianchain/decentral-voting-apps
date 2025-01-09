// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    mapping (uint256 => Candidate) public candidates;
    mapping (address => bool) public voters;
    uint256 public candidatesCount;
    uint256 public votingEndTime;

    event votedEvent(uint256 indexed _candidateId);

    constructor(uint256 _durationInHours) {
        votingEndTime = block.timestamp + (_durationInHours * 1 hours);
    }

    function addCandidate(string memory _name) public {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }

    function vote(uint256 _candidateId) public {
        require(!voters[msg.sender], "You have already voted before!");
        require(block.timestamp < votingEndTime, "Voting has ended!");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidates ID!");

        voters[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        emit votedEvent(_candidateId);
    }

    function getCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory candidateList = new Candidate[](candidatesCount);
        for(uint i = 1; i<= candidatesCount; i++) {
            candidateList[i - 1] = candidates[i];
        }
        return candidateList;
    }


    function hasVotingEnded() public view returns (bool) {
        return block.timestamp >= votingEndTime;
    }
}