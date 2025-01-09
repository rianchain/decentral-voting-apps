import React, { useEffect, useState } from 'react'
import Web3 from 'web3'
import VotingContract from './Voting.json'

const App = () => {
  const [account, setAccount] = useState('')
  const [candidates, setCandidates] = useState([])
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadingBlockchainData = async () => {
      const web3 = new Web3(window.ethereum)
      const accounts = await web3.eth.requestAccounts()
      setAccount(accounts[0])

      const networkId = await web3.eth.net.getId();
      const deployedNetwork = VotingContract.networks[networkId]
      const instance = new web3.eth.Contract(
        VotingContract.abi,
        deployedNetwork && deployedNetwork.address,
      )
      setContract(instance)

      const candidatesList = await instance.methods.getCandidates().Call()
      setCandidates(candidatesList)
      setLoading(false)
    }

    loadingBlockchainData()
  }, [])

  const vote = async (candidateId) => {
    setLoading(true)
    await contract.methods.vote(candidateId).send({ from: account })
    const updatedCandidates = await contract.methods.getCandidates().call()
    setCandidates(updatedCandidates)
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Decentralized Voting</h1>
      <h2>Account: {account}</h2>
      <h3>Candidates</h3>
      <ul>
        {candidates.map((candidate) => (
          <li key={candidates.id}>
            {candidates.name} - Votes: {candidates.voteCount}
            <button onClick={() => vote(candidate.id)}>Vote</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App;