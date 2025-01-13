import React, { useEffect, useState } from "react";
import Web3 from "web3";
import { VotingContractABI } from "./abis/VotingContract";
import "./App.css";
import { CONTRACT_ADDRESS, NETWORK_ID } from "./config";

const App = () => {
  const [account, setAccount] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCandidateName, setNewCandidateName] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");

  useEffect(() => {
    loadBlockchainData();
    // Refresh data setiap 30 detik
    const interval = setInterval(() => {
      loadBlockchainData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadBlockchainData = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask tidak terdeteksi! Silakan install MetaMask.");
      }

      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();
      setAccount(accounts[0]);

      const networkId = await web3.eth.net.getId();
      if (networkId.toString() !== NETWORK_ID) {
        throw new Error(
          `Silakan hubungkan ke jaringan yang benar (Network ID: ${NETWORK_ID})`
        );
      }

      const instance = new web3.eth.Contract(
        VotingContractABI,
        CONTRACT_ADDRESS
      );
      setContract(instance);

      // Ambil daftar kandidat
      const candidatesList = await instance.methods.getCandidates().call();
      const formattedCandidates = candidatesList.map((candidate, index) => ({
        id: index + 1,
        name: candidate.name || candidate[1],
        voteCount: parseInt(candidate.voteCount || candidate[2]),
      }));

      setCandidates(formattedCandidates);
      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const addCandidate = async () => {
    try {
      setTransactionStatus("Menambahkan kandidat...");
      setLoading(true);
      await contract.methods
        .addCandidate(newCandidateName)
        .send({ from: account });
      setNewCandidateName("");
      await loadBlockchainData();
      setTransactionStatus("Kandidat berhasil ditambahkan!");
    } catch (err) {
      setError(err.message);
      setTransactionStatus("Gagal menambahkan kandidat.");
    } finally {
      setLoading(false);
    }
  };

  const vote = async (candidateId) => {
    try {
      setTransactionStatus("Memproses vote...");
      setLoading(true);
      await contract.methods.vote(candidateId).send({ from: account });
      await loadBlockchainData();
      setTransactionStatus("Vote berhasil!");
    } catch (err) {
      console.error("Error detail:", err);
      // Cek pesan error dari smart contract
      if (err.message.includes("You have already voted before")) {
        setError("Anda sudah melakukan voting sebelumnya!");
      } else if (err.message.includes("Invalid candidates ID")) {
        setError("ID kandidat tidak valid!");
      } else {
        setError("Gagal melakukan voting. Silakan coba lagi.");
      }
      setTransactionStatus("Gagal melakukan vote.");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Memuat data blockchain...</p>
        {transactionStatus && (
          <p className="transaction-status">{transactionStatus}</p>
        )}
      </div>
    );

  return (
    <div className="app-container">
      <header>
        <h1>Aplikasi Voting Terdesentralisasi</h1>
        <div className="account-info">
          <span>Alamat Wallet Anda:</span>
          <code>{account}</code>
        </div>
      </header>

      <main>
        {error && (
          <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        )}

        <div className="add-candidate-container">
          <h2>Tambah Kandidat Baru</h2>
          <div className="add-candidate-form">
            <input
              type="text"
              value={newCandidateName}
              onChange={(e) => setNewCandidateName(e.target.value)}
              placeholder="Nama Kandidat"
              className="candidate-input"
            />
            <button
              onClick={addCandidate}
              className="add-button"
              disabled={!newCandidateName.trim()}
            >
              Tambah Kandidat
            </button>
          </div>
        </div>

        <div className="candidates-container">
          <h2>Daftar Kandidat</h2>
          {transactionStatus && (
            <div className="transaction-status-banner">{transactionStatus}</div>
          )}
          <div className="candidates-grid">
            {candidates.length === 0 ? (
              <p className="no-candidates">
                Belum ada kandidat yang ditambahkan.
              </p>
            ) : (
              candidates.map((candidate) => (
                <div key={candidate.id} className="candidate-card">
                  <h3>{candidate.name}</h3>
                  <div className="vote-count">
                    <span>{candidate.voteCount}</span>
                    <small>suara</small>
                  </div>
                  <button
                    onClick={() => vote(candidate.id)}
                    className="vote-button"
                  >
                    Pilih Kandidat
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
