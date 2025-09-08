/**
 * Drizz UI Testing Tool - Image Upload Component
 * Handles mobile screenshot upload with drag & drop functionality
 */

import React, { useState, useRef } from 'react';
import { useAppContext } from '../App';

const ImageUpload = () => {
  const { updateAppState } = useAppContext();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      uploadImage(imageFile);
    } else {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      uploadImage(file);
    }
  };

  const uploadImage = async (file) => {
    setUploadStatus('uploading');
    updateAppState({ isLoading: true, error: null });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        updateAppState({
          uploadedImage: result.image_data,
          imageMetadata: {
            width: result.width,
            height: result.height,
            filename: result.filename
          },
          isLoading: false
        });
        setUploadStatus('success');
      } else {
        throw new Error('Upload failed');
      }

    } catch (error) {
      console.error('Image upload error:', error);
      updateAppState({
        isLoading: false,
        error: `Image upload failed: ${error.message}`
      });
      setUploadStatus('error');
    }

    // Reset status after 3 seconds
    setTimeout(() => setUploadStatus('idle'), 3000);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const getStatusContent = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <div className="upload-status uploading">
            <div className="spinner"></div>
            <p>Uploading image...</p>
          </div>
        );
      case 'success':
        return (
          <div className="upload-status success">
            <div className="icon">✅</div>
            <p>Image uploaded successfully!</p>
          </div>
        );
      case 'error':
        return (
          <div className="upload-status error">
            <div className="icon">❌</div>
            <p>Upload failed. Please try again.</p>
          </div>
        );
      default:
        return (
          <div className="upload-content">
            <div className="upload-icon">📱</div>
            <h3>Upload Mobile Screenshot</h3>
            <p>Drag & drop your mobile app screenshot here</p>
            <p className="upload-hint">or</p>
            <button className="upload-button" onClick={triggerFileSelect}>
              Choose File
            </button>
            <p className="upload-formats">
              Supports: PNG, JPG, JPEG (Max 10MB)
            </p>
          </div>
        );
    }
  };

  return (
    <div className="image-upload">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${uploadStatus}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={uploadStatus === 'idle' ? triggerFileSelect : undefined}
      >
        {getStatusContent()}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Image Preview */}
      <ImagePreview />
    </div>
  );
};

const ImagePreview = () => {
  const { uploadedImage, imageMetadata } = useAppContext();

  if (!uploadedImage) return null;

  return (
    <div className="image-preview">
      <h4>📱 Preview</h4>
      <div className="preview-container">
        <img 
          src={uploadedImage} 
          alt="Uploaded screenshot" 
          className="preview-image"
        />
        <div className="image-info">
          <p><strong>Filename:</strong> {imageMetadata.filename}</p>
          <p><strong>Dimensions:</strong> {imageMetadata.width} × {imageMetadata.height}</p>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
