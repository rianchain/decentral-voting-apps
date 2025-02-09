import React, { useState } from "react";
import axios from "axios";

const ImageUpload = ({ onImageUpload, onError }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;

    // Preview gambar
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "rpgzeoez");

    try {
      setUploading(true);
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/dkemzm4ju/image/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data && response.data.secure_url) {
        onImageUpload(response.data.secure_url);
      } else {
        throw new Error("Upload gagal");
      }
    } catch (error) {
      console.error("Error uploading:", error);
      onError("Gagal mengupload gambar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload-container">
      <div
        className={`image-upload-area ${dragActive ? "drag-active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="image-preview">
            <img src={preview} alt="Preview" />
            <button
              className="remove-preview"
              onClick={() => {
                setPreview(null);
                onImageUpload("");
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <>
            <div className="upload-icon">📸</div>
            <p>Drag & drop gambar di sini atau</p>
            <label className="upload-button">
              Pilih File
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploading}
                hidden
              />
            </label>
          </>
        )}
        {uploading && (
          <div className="upload-loading">Mengupload gambar...</div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
