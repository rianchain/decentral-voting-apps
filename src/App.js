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

    
  })
}