// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
        string imageUrl;
    }

    address public owner;
    address[] voterList;

    constructor() {
        owner = msg.sender;
    }

    mapping (uint256 => Candidate) public candidates;
    mapping (address => bool) public voters;
    uint256 public candidatesCount;

    event votedEvent(uint256 indexed _candidateId);
    event CandidateRemoved(string imageUrl);


    function addCandidate(string memory _name, string memory _imageUrl) public {
        require(owner == msg.sender, "Only owner/admin can add candidates!" );
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0, _imageUrl);
    }

    function vote(uint256 _candidateId) public {
        require(!voters[msg.sender], "You have already voted before!");
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidates ID!");

        voters[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        voterList.push(msg.sender);

        emit votedEvent(_candidateId);
    }

    function getCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory candidateList = new Candidate[](candidatesCount);
        for(uint i = 1; i<= candidatesCount; i++) {
            candidateList[i - 1] = candidates[i];
        }
        return candidateList;
    }

    function removeCandidates(uint256 index) public onlyOwner {
        require(index > 0 && index <= candidatesCount, "Invalid candidates index!");
        
        string memory imageToDelete = candidates[index].imageUrl;
        
        candidates[index] = candidates[candidatesCount];

        for (uint256 i = 0; i < voterList.length; i++) {
            voters[voterList[i]] = false;
        }

        delete candidates[candidatesCount];
        candidatesCount--;

        emit CandidateRemoved(imageToDelete);
    }

    modifier onlyOwner() {
        require (msg.sender == owner, "Only owner can perform this action!");
    _;
    }

}