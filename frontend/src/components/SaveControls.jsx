/**
 * SaveControls.jsx - Export and Save Controls
 * Handles saving selected elements as CSV and exporting annotated screenshots
 */

import React, { useState } from 'react';
import { useAppContext } from '../App';
import { exportCanvasAsImage } from '../utils/canvasUtils';

const SaveControls = () => {
  const { selectedElements, uiElements, imageMetadata, uploadedImage } = useAppContext();
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState(null);

  const generateTimestamp = () => {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  };

  const saveSelectedAsCSV = async () => {
    if (selectedElements.size === 0) {
      alert('⚠️ No elements selected to save. Please select some elements first.');
      return;
    }

    setIsExporting(true);

    try {
      const selectedElementsList = uiElements.filter(el => selectedElements.has(el.id));
      
      // CSV Headers
      const headers = [
        'ID',
        'Element Type', 
        'Class Name',
        'Text Content',
        'Resource ID',
        'Bounds (x1,y1,x2,y2)',
        'Clickable',
        'Visible',
        'Enabled'
      ];

      // Generate CSV content
      const csvRows = [headers.join(',')];
      
      selectedElementsList.forEach(element => {
        const row = [
          `"${element.id}"`,
          `"${element.class?.split('.').pop() || 'Unknown'}"`,
          `"${element.class || ''}"`,
          `"${(element.text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`, // Handle quotes and newlines
          `"${element.resourceId || ''}"`,
          `"[${element.bounds?.x1 || 0},${element.bounds?.y1 || 0},${element.bounds?.x2 || 0},${element.bounds?.y2 || 0}]"`,
          `"${element.clickable ? 'Yes' : 'No'}"`,
          `"${element.visible ? 'Yes' : 'No'}"`,
          `"${element.enabled ? 'Yes' : 'No'}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const timestamp = generateTimestamp();
      const filename = `drizz-ui-elements-${timestamp}.csv`;

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLastExport({ type: 'CSV', filename, count: selectedElements.size });
      
    } catch (error) {
      console.error('CSV export error:', error);
      alert('❌ Failed to export CSV. Please try again.');
    }

    setIsExporting(false);
  };

  const saveAnnotatedImage = async () => {
    if (!uploadedImage) {
      alert('⚠️ No image available to save. Please upload an image first.');
      return;
    }

    const canvas = document.querySelector('.main-canvas');
    if (!canvas) {
      alert('❌ Canvas not ready. Please wait for the image to load.');
      return;
    }

    setIsExporting(true);

    try {
      const timestamp = generateTimestamp();
      const filename = `drizz-annotated-screenshot-${timestamp}`;
      
      // Export canvas as PNG
      exportCanvasAsImage(canvas, filename, 'png');
      
      setLastExport({ 
        type: 'Image', 
        filename: `${filename}.png`, 
        count: selectedElements.size 
      });

    } catch (error) {
      console.error('Image export error:', error);
      alert('❌ Failed to export image. Please try again.');
    }

    setIsExporting(false);
  };

  const saveProjectState = () => {
    const projectData = {
      timestamp: new Date().toISOString(),
      imageMetadata,
      selectedElements: Array.from(selectedElements),
      totalElements: uiElements.length,
      appVersion: '1.0.0'
    };

    const jsonContent = JSON.stringify(projectData, null, 2);
    const timestamp = generateTimestamp();
    const filename = `drizz-project-state-${timestamp}.json`;

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setLastExport({ type: 'Project State', filename, count: selectedElements.size });
  };

  return (
    <div className="save-controls">
      {/* Drizz Purple Logo */}
      <div className="drizz-logo">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#8A2BE2"/>
          <path d="M8 12h24v4H20v12h-4V16H8v-4z" fill="white"/>
          <circle cx="32" cy="8" r="4" fill="#DDA0DD"/>
        </svg>
        <span className="logo-text">Drizz</span>
      </div>

      {/* Export Statistics */}
      <div className="export-stats">
        <div className="stat-item">
          <span className="stat-number">{selectedElements.size}</span>
          <span className="stat-label">Selected Elements</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{uiElements.length}</span>
          <span className="stat-label">Total Elements</span>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="export-buttons">
        <button
          onClick={saveSelectedAsCSV}
          disabled={selectedElements.size === 0 || isExporting}
          className="export-btn primary"
          title="Export selected elements as CSV file"
        >
          {isExporting ? (
            <>
              <div className="spinner small"></div>
              Exporting...
            </>
          ) : (
            <>
              📊 Export CSV
              <span className="btn-subtitle">({selectedElements.size} elements)</span>
            </>
          )}
        </button>

        <button
          onClick={saveAnnotatedImage}
          disabled={!uploadedImage || isExporting}
          className="export-btn secondary"
          title="Save annotated screenshot as PNG image"
        >
          {isExporting ? (
            <>
              <div className="spinner small"></div>
              Saving...
            </>
          ) : (
            <>
              🖼️ Save Image
              <span className="btn-subtitle">PNG format</span>
            </>
          )}
        </button>

        <button
          onClick={saveProjectState}
          disabled={uiElements.length === 0 || isExporting}
          className="export-btn tertiary"
          title="Save current project state as JSON"
        >
          💾 Save State
          <span className="btn-subtitle">JSON format</span>
        </button>
      </div>

      {/* Last Export Info */}
      {lastExport && (
        <div className="last-export">
          <div className="export-success">
            ✅ {lastExport.type} exported successfully!
          </div>
          <div className="export-details">
            <span className="filename">{lastExport.filename}</span>
            <span className="element-count">({lastExport.count} elements)</span>
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className="export-options">
        <details>
          <summary>⚙️ Export Options</summary>
          <div className="options-content">
            <label>
              <input type="checkbox" defaultChecked />
              Include element bounds
            </label>
            <label>
              <input type="checkbox" defaultChecked />
              Include text content
            </label>
            <label>
              <input type="checkbox" />
              Include screenshots
            </label>
          </div>
        </details>
      </div>
    </div>
  );
};

export default SaveControls;
