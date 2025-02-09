import React, { useEffect, useState } from "react";
import Web3 from "web3";
import { VotingContractABI } from "./abis/VotingContract";
import "./App.css";
import { CONTRACT_ADDRESS, NETWORK_ID } from "./config";
import Login from "./components/Login";
import ImageUpload from "./components/ImageUpload";
import axios from "axios";

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
  const [selectedImage, setSelectedImage] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState(""); // success, error, info

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

      // Cek apakah akun yang terkoneksi adalah owner
      const ownerAddress = await instance.methods.owner().call();
      setIsOwner(accounts[0].toLowerCase() === ownerAddress.toLowerCase());

      // Ambil daftar kandidat
      const candidatesList = await instance.methods.getCandidates().call();
      const formattedCandidates = candidatesList.map((candidate, index) => ({
        id: index + 1,
        name: candidate.name || candidate[1],
        voteCount: parseInt(candidate.voteCount || candidate[2]),
        imageUrl: candidate.imageUrl || candidate[3],
      }));

      setCandidates(formattedCandidates);

      // Cek status voting untuk akun yang terkoneksi
      const hasVotedStatus = await instance.methods.voters(accounts[0]).call();
      setHasVoted(hasVotedStatus);

      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const addCandidate = async () => {
    try {
      if (!selectedImage) {
        setError("Silakan upload foto kandidat terlebih dahulu");
        return;
      }

      setTransactionStatus("Menambahkan kandidat...");
      setLoading(true);
      await contract.methods
        .addCandidate(newCandidateName, selectedImage)
        .send({ from: account });

      setNewCandidateName("");
      setSelectedImage("");
      await loadBlockchainData();
      showToastMessage("Kandidat berhasil ditambahkan!");
    } catch (err) {
      showToastMessage(err.message, "error");
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

      showToastMessage("Vote berhasil tercatat!");
      setHasVoted(true);
    } catch (err) {
      console.error("Error detail:", err);
      if (err.message.includes("You have already voted before")) {
        showToastMessage("Anda sudah melakukan voting sebelumnya!", "error");
      } else if (err.message.includes("Invalid candidates ID")) {
        showToastMessage("ID kandidat tidak valid!", "error");
      } else {
        showToastMessage("Gagal melakukan voting. Silakan coba lagi.", "error");
      }
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

      // Hanya hapus dari blockchain
      await contract.methods.removeCandidates(index).send({ from: account });

      // Refresh data
      await loadBlockchainData();
      showToastMessage("Kandidat berhasil dihapus!");
    } catch (err) {
      showToastMessage(
        "Gagal menghapus kandidat. Hanya owner yang dapat menghapus kandidat.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menampilkan toast
  const showToastMessage = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
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
        <h1>VoteChain3(demo)</h1>
        <div className="account-info">
          <span>Alamat Wallet Anda:</span>
          <code>{account}</code>
          <span className="role-badge">{isOwner ? "Admin" : "Voter"}</span>
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

        {isOwner && (
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
              <ImageUpload
                onImageUpload={(url) => setSelectedImage(url)}
                onError={setError}
              />
              <button
                onClick={addCandidate}
                className="add-button"
                disabled={!newCandidateName.trim() || !selectedImage}
              >
                Tambah Kandidat
              </button>
            </div>
          </div>
        )}

        <div className="candidates-container">
          <h2>Daftar Kandidat</h2>
          {/* {transactionStatus && (
            <div className="transaction-status-banner">{transactionStatus}</div>
          )} */}
          <div className="candidates-grid">
            {candidates.length === 0 ? (
              <p className="no-candidates">
                Belum ada kandidat yang ditambahkan.
              </p>
            ) : (
              candidates.map((candidate) => (
                <div key={candidate.id} className="candidate-card">
                  {isOwner && (
                    <button
                      onClick={() => removeCandidate(candidate.id)}
                      className="remove-button"
                      title="Hapus Kandidat"
                    >
                      ×
                    </button>
                  )}
                  {candidate.imageUrl && (
                    <img
                      src={candidate.imageUrl}
                      alt={candidate.name}
                      className="candidate-image"
                    />
                  )}
                  <div className="candidate-info">
                    <h3>{candidate.name}</h3>
                    <div className="vote-count">
                      <span>{candidate.voteCount}</span>
                      <small>suara</small>
                    </div>
                    {!isOwner && !hasVoted && (
                      <button
                        onClick={() => vote(candidate.id)}
                        className="vote-button"
                        disabled={hasVoted}
                      >
                        {hasVoted ? "Anda Sudah Memilih" : "Pilih Kandidat"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className={`toast-notification ${toastType}`}>
          {toastMessage}
          <button className="toast-close" onClick={() => setShowToast(false)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
