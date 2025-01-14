import React, { useEffect, useState } from "react";
import Web3 from "web3";
import { VotingContractABI } from "./abis/VotingContract";
import "./App.css";
import { CONTRACT_ADDRESS, NETWORK_ID } from "./config";
import Login from "./components/Login";

const App = () => {
  const [account, setAccount] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCandidateName, setNewCandidateName] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(false);

  const connectWallet = async () => {
    try {
      // Hapus status disconnect
      localStorage.removeItem("walletDisconnected");
      setIsManuallyDisconnected(false);

      if (!window.ethereum) {
        throw new Error("MetaMask tidak terdeteksi! Silakan install MetaMask.");
      }

      setLoading(true);
      const web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.requestAccounts();

      if (accounts.length === 0) {
        throw new Error("Tidak ada akun yang terdeteksi!");
      }

      const networkId = await web3.eth.net.getId();
      if (networkId.toString() !== NETWORK_ID) {
        throw new Error(
          `Silakan hubungkan ke jaringan yang benar (Network ID: ${NETWORK_ID})`
        );
      }

      setAccount(accounts[0]);
      setIsConnected(true);
      await loadBlockchainData();
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Cek apakah user sudah manual disconnect
      const isDisconnected =
        localStorage.getItem("walletDisconnected") === "true";

      if (isDisconnected) {
        setIsManuallyDisconnected(true);
        setIsConnected(false);
        setLoading(false);
        return; // Hentikan eksekusi jika user sudah disconnect
      }

      // Jika tidak disconnect, lanjutkan dengan pengecekan koneksi
      if (!isManuallyDisconnected) {
        await checkConnection();
      }
    };

    init();

    // Event listeners untuk MetaMask
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        // Jika user sudah manual disconnect, abaikan perubahan akun
        if (localStorage.getItem("walletDisconnected") === "true") {
          return;
        }
        handleAccountsChanged(accounts);
      });

      window.ethereum.on("chainChanged", () => {
        // Jika user sudah manual disconnect, abaikan perubahan network
        if (localStorage.getItem("walletDisconnected") === "true") {
          return;
        }
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      }
    };
  }, [isManuallyDisconnected]);

  const handleAccountsChanged = (accounts) => {
    if (!isManuallyDisconnected) {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        loadBlockchainData();
      } else {
        setIsConnected(false);
        setAccount("");
      }
    }
  };

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          await loadBlockchainData();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

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

  const disconnectWallet = async () => {
    try {
      // Set manual disconnect
      setIsManuallyDisconnected(true);

      // Reset semua state
      setIsConnected(false);
      setAccount("");
      setContract(null);
      setCandidates([]);
      setTransactionStatus("");
      setError("");

      // Simpan status disconnect di localStorage
      localStorage.setItem("walletDisconnected", "true");
      localStorage.removeItem("userAccount");

      // Force reload halaman untuk memastikan koneksi terputus
      window.location.reload();
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  const removeCandidate = async (index) => {
    try {
      setTransactionStatus("Menghapus kandidat...");
      setLoading(true);
      await contract.methods.removeCandidates(index).send({ from: account });
      await loadBlockchainData();
      setTransactionStatus("Kandidat berhasil dihapus!");
    } catch (err) {
      console.error("Error detail:", err);
      setError(
        "Gagal menghapus kandidat. Hanya owner yang dapat menghapus kandidat."
      );
      setTransactionStatus("Gagal menghapus kandidat.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Memuat data blockchain...</p>
        {transactionStatus && (
          <p className="transaction-status">{transactionStatus}</p>
        )}
      </div>
    );
  }

  if (isManuallyDisconnected || !isConnected) {
    return <Login onLogin={connectWallet} />;
  }

  return (
    <div className="app-container">
      <header>
        <h1>VoteChain (demo)</h1>
        <div className="account-info">
          <span>Alamat Wallet Anda:</span>
          <code>{account}</code>
          <br></br>
          <button onClick={disconnectWallet} className="logout-button">
            <span>LOGOUT</span>
          </button>
        </div>
      </header>

      <main>
        {/* {error && (
          <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        )} */}

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
                  <button
                    onClick={() => removeCandidate(candidate.id)}
                    className="remove-button"
                    title="Hapus Kandidat"
                  >
                    ×
                  </button>
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
