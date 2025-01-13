import React from "react";
import metamaskLogo from "../assets/metamask.png"; // Pastikan ada gambar metamask

const Login = ({ onLogin }) => {
  return (
    <div className="login-container">
      <div className="login-card">
        {/* <h1>Selamat Datang di :</h1> */}
        <h2>VoteChain3 Pemilu</h2>
        <p>
          Selamat Datang 😉 Silakan hubungkan wallet MetaMask Anda untuk
          melanjutkan
        </p>
        <button className="connect-button" onClick={onLogin}>
          <img src={metamaskLogo} alt="MetaMask" className="metamask-logo" />
          <span>Hubungkan dengan MetaMask</span>
        </button>
      </div>
    </div>
  );
};

export default Login;
