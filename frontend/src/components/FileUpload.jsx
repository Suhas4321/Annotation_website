/**
 * Drizz UI Testing Tool - File Upload Component
 * Handles JSON/XML UI automation data upload with paste functionality
 */

import React, { useState, useRef } from 'react';
import { useAppContext } from '../App';

const FileUpload = () => {
  const { updateAppState } = useAppContext();
  const [activeTab, setActiveTab] = useState('upload'); // upload or paste
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [pasteContent, setPasteContent] = useState('');
  const [isValidJson, setIsValidJson] = useState(true);
  const fileInputRef = useRef(null);

  const processJsonData = async (jsonData, source = 'file') => {
    setUploadStatus('processing');
    updateAppState({ isLoading: true, error: null });

    try {
      let data;
      if (typeof jsonData === 'string') {
        data = JSON.parse(jsonData);
      } else {
        data = jsonData;
      }

      // Process UI elements from JSON
      const elements = [];
      for (const [elementId, elementData] of Object.entries(data)) {
        if (typeof elementData === 'object' && elementData.bounds) {
          // Parse bounds [x1,y1][x2,y2]
          const bounds = parseBounds(elementData.bounds);
          if (bounds) {
            const element = {
              id: elementId,
              bounds: bounds,
              class: elementData.class || '',
              text: elementData.text || '',
              resourceId: elementData['resource-id'] || '',
              contentDesc: elementData['content-desc'] || '',
              clickable: elementData.clickable === 'true',
              enabled: elementData.enabled === 'true',
              visible: elementData['visible-to-user'] === 'true',
              focused: elementData.focused === 'true'
            };
            elements.append(element);
          }
        }
      }

      // Update app state with processed elements
      updateAppState({
        uiElements: elements,
        selectedElements: new Set(elements.map(el => el.id)), // Select all by default
        isLoading: false
      });

      setUploadStatus('success');
      console.log(`Processed ${elements.length} UI elements from ${source}`);

    } catch (error) {
      console.error('JSON processing error:', error);
      updateAppState({
        isLoading: false,
        error: `JSON processing failed: ${error.message}`
      });
      setUploadStatus('error');
      setIsValidJson(false);
    }

    // Reset status after 3 seconds
    setTimeout(() => {
      setUploadStatus('idle');
      setIsValidJson(true);
    }, 3000);
  };

  const parseBounds = (boundsStr) => {
    try {
      // Parse bounds format: [x1,y1][x2,y2]
      const matches = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
      if (matches) {
        return {
          x1: parseInt(matches[1]),
          y1: parseInt(matches[2]),
          x2: parseInt(matches[3]),
          y2: parseInt(matches[4])
        };
      }
      return null;
    } catch (error) {
      console.error('Bounds parsing error:', error);
      return null;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json') && !file.name.endsWith('.xml')) {
      setUploadStatus('error');
      updateAppState({ error: 'Please upload a JSON or XML file' });
      return;
    }

    try {
      const text = await file.text();
      await processJsonData(text, 'file');
    } catch (error) {
      setUploadStatus('error');
      updateAppState({ error: `File reading failed: ${error.message}` });
    }
  };

  const handlePasteProcess = async () => {
    if (!pasteContent.trim()) {
      setUploadStatus('error');
      updateAppState({ error: 'Please paste JSON content first' });
      return;
    }

    await processJsonData(pasteContent.trim(), 'paste');
  };

  const handlePasteChange = (e) => {
    const content = e.target.value;
    setPasteContent(content);
    
    // Validate JSON in real-time
    if (content.trim()) {
      try {
        JSON.parse(content);
        setIsValidJson(true);
      } catch (error) {
        setIsValidJson(false);
      }
    } else {
      setIsValidJson(true);
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'processing':
        return <div className="spinner small"></div>;
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📄';
    }
  };

  return (
    <div className="file-upload">
      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          📁 Upload File
        </button>
        <button
          className={`tab ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
        >
          📋 Paste JSON
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="upload-tab">
          <div className="upload-area">
            <div className="upload-icon">{getStatusIcon()}</div>
            <h4>Upload UI Automation Data</h4>
            <p>Select JSON or XML file containing UI element data</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.xml"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus === 'processing'}
            >
              {uploadStatus === 'processing' ? 'Processing...' : 'Choose File'}
            </button>
            
            <p className="file-formats">Supports: .json, .xml files</p>
          </div>
        </div>
      )}

      {/* Paste Tab */}
      {activeTab === 'paste' && (
        <div className="paste-tab">
          <div className="paste-area">
            <h4>Paste JSON Content</h4>
            <textarea
              value={pasteContent}
              onChange={handlePasteChange}
              placeholder='Paste your JSON content here... e.g., {"1": {"bounds": "[0,63][1080,1491]", "class": "android.widget.FrameLayout"}, ...}'
              className={`paste-textarea ${!isValidJson ? 'invalid' : ''}`}
              rows={8}
            />
            
            <div className="paste-controls">
              <div className="validation-status">
                {pasteContent && (
                  <span className={`status ${isValidJson ? 'valid' : 'invalid'}`}>
                    {isValidJson ? '✅ Valid JSON' : '❌ Invalid JSON'}
                  </span>
                )}
              </div>
              
              <button
                className="process-btn"
                onClick={handlePasteProcess}
                disabled={!pasteContent.trim() || !isValidJson || uploadStatus === 'processing'}
              >
                {uploadStatus === 'processing' ? 'Processing...' : 'Process JSON'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {uploadStatus === 'success' && (
        <div className="status-message success">
          ✅ UI elements processed successfully!
        </div>
      )}
      
      {uploadStatus === 'error' && (
        <div className="status-message error">
          ❌ Processing failed. Please check your JSON format.
        </div>
      )}
    </div>
  );
};

export default FileUpload;
