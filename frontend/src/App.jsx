import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import BoundingBoxOverlay from './components/BoundingBoxOverlay';

// Database components (create these)
import DatabaseBrowser from './components/DatabaseBrowser';
import ProjectsList from './components/ProjectsList';
import ProjectDetail from './components/ProjectDetail';

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uiElements, setUiElements] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentShortId, setCurrentShortId] = useState(null);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header with Navigation */}
      <header style={{
        background: 'linear-gradient(135deg, #8A2BE2, #DDA0DD)',
        color: 'white',
        padding: '20px',
      }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
            <h1>🎯 Drizz UI Annotation Platform</h1>
          </Link>
          
          <div style={{ display: 'flex', gap: '15px' }}>
            <Link to="/" style={{ 
              color: 'white', 
              padding: '10px 20px', 
              textDecoration: 'none',
              borderRadius: '6px',
              transition: 'background 0.3s ease'
            }}>
              🏠 Annotation
            </Link>
            <Link to="/database" style={{ 
              color: 'white', 
              padding: '10px 20px', 
              textDecoration: 'none',
              background: '#28a745',
              borderRadius: '6px',
              transition: 'background 0.3s ease'
            }}>
              🗄️ Database
            </Link>
          </div>
        </nav>
      </header>

      {/* Routes */}
      <Routes>
        <Route path="/" element={
          <AnnotationTool 
            uploadedImage={uploadedImage}
            setUploadedImage={setUploadedImage}
            uiElements={uiElements}
            setUiElements={setUiElements}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            currentShortId={currentShortId}
            setCurrentShortId={setCurrentShortId}
          />
        } />
        <Route path="/database" element={<DatabaseBrowser />} />
        <Route path="/database/projects" element={<ProjectsList />} />
        <Route path="/database/project/:id" element={<ProjectDetail />} />
      </Routes>
    </div>
  );
}

// Extract annotation logic into separate component
function AnnotationTool({ 
  uploadedImage, setUploadedImage, 
  uiElements, setUiElements, 
  currentProjectId, setCurrentProjectId, 
  currentShortId, setCurrentShortId 
}) {
  const [showBounds, setShowBounds] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Your existing upload handlers here...
  const handleImageUpload = async (file) => {
    console.log('🔍 Starting image upload:', file.name, file.size, file.type);
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setUploadedImage(result);
        console.log('✅ Image upload successful!');
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Image upload error:', error);
      alert('❌ Image upload failed: ' + error.message);
    }
    setIsLoading(false);
  };

  const handleJsonUpload = async (file) => {
    console.log('🔍 Starting JSON upload:', file.name, file.size);
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    if (uploadedImage) {
      formData.append('image_data', uploadedImage.image_data);
      formData.append('image_filename', uploadedImage.filename);
    }

    try {
      const response = await fetch('/api/upload-json', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setUiElements(result.elements);
        
        if (result.project_id) {
          setCurrentProjectId(result.project_id);
        }
        
        if (result.short_id) {
          setCurrentShortId(result.short_id);
        }
        
        alert(`✅ Loaded ${result.elements.length} UI elements! Project: ${result.short_id}`);
      } else {
        throw new Error(result.message || 'JSON processing failed');
      }
    } catch (error) {
      console.error('❌ JSON upload error:', error);
      alert('❌ JSON upload failed: ' + error.message);
    }
    setIsLoading(false);
  };

  const handleSaveSuccess = (updatedInfo) => {
    console.log('✅ Annotations saved successfully!', updatedInfo);
    if (updatedInfo?.project_id) setCurrentProjectId(updatedInfo.project_id);
    if (updatedInfo?.short_id) setCurrentShortId(updatedInfo.short_id);
  };

  return (
    <div>
      {/* Show project status */}
      {currentProjectId && (
        <div style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          textAlign: 'center',
          borderBottom: '1px solid #dee2e6'
        }}>
          <p style={{ margin: '0', color: '#666' }}>
            Project ID: {currentProjectId.slice(0, 16)}...
            {currentShortId && <span> | Short ID: {currentShortId}</span>}
            <span> | Database: Connected ✅</span>
          </p>
        </div>
      )}

      {/* Upload Section */}
      {!showBounds && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ 
            background: '#f8f9fa', 
            padding: '30px', 
            borderRadius: '12px',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <h2>📱 Upload Files</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <h3>1. Upload Screenshot</h3>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
                disabled={isLoading}
                style={{ padding: '10px', margin: '10px' }}
              />
              {uploadedImage && (
                <div style={{ color: 'green', marginTop: '10px' }}>
                  ✅ {uploadedImage.filename} ({uploadedImage.width}×{uploadedImage.height})
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>2. Upload UI Data (JSON/XML)</h3>
              <input 
                type="file" 
                accept=".json,.xml"
                onChange={(e) => e.target.files[0] && handleJsonUpload(e.target.files[0])}
                disabled={isLoading}
                style={{ padding: '10px', margin: '10px' }}
              />
              {uiElements.length > 0 && (
                <div style={{ color: 'green', marginTop: '10px' }}>
                  ✅ Loaded {uiElements.length} UI elements
                  {currentShortId && <span> | Project: {currentShortId}</span>}
                </div>
              )}
            </div>

            {/* Start Annotation Button */}
            {uploadedImage && uiElements.length > 0 && (
              <button 
                onClick={() => setShowBounds(true)}
                style={{
                  background: '#8A2BE2',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '8px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🎯 Start Annotation
              </button>
            )}

            {isLoading && <div style={{ marginTop: '15px' }}>⏳ Processing...</div>}
          </div>
        </div>
      )}

      {/* Annotation Section */}
      {showBounds && uploadedImage && uiElements.length > 0 && (
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>🎯 Annotation Platform</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowBounds(false)}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '4px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ← Back to Upload
              </button>
            </div>
          </div>
          
          <BoundingBoxOverlay 
            imageSrc={uploadedImage.image_data}
            elements={uiElements}
            projectId={currentProjectId}
            shortId={currentShortId}
            onSaveSuccess={handleSaveSuccess}
          />
        </div>
      )}
    </div>
  );
}

export default App;
