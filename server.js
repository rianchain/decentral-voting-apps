const express = require("express");
const cors = require("cors");
const crypto = require("crypto-js");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Endpoint untuk generate signature
app.post("/api/cloudinary-signature", (req, res) => {
  const { timestamp } = req.body;
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const apiSecret = process.env.REACT_APP_CLOUDINARY_API_SECRET;

  // Generate signature
  const str = `timestamp=${timestamp}&upload_preset=${process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET}${apiSecret}`;
  const signature = crypto.SHA1(str).toString();

  res.json({ signature });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
