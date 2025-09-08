/**
 * Drizz UI Testing Tool - Bounding Box Canvas Component
 * HTML5 Canvas-based visualization of UI elements with interactive bounding boxes
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../App';
import { getElementColor, drawBoundingBox, scaleCoordinates } from '../utils/canvasUtils';

const BoundingBoxCanvas = () => {
  const { uploadedImage, uiElements, selectedElements, imageMetadata, toggleElement } = useAppContext();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Initialize canvas when image is loaded
  useEffect(() => {
    if (uploadedImage) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        calculateCanvasSize(img);
        setIsImageLoaded(true);
      };
      img.src = uploadedImage;
    }
  }, [uploadedImage]);

  // Redraw canvas when elements or selection changes
  useEffect(() => {
    if (isImageLoaded && canvasRef.current) {
      drawCanvas();
    }
  }, [uiElements, selectedElements, isImageLoaded, scale, hoveredElement]);

  const calculateCanvasSize = (img) => {
    const maxWidth = 800;
    const maxHeight = 600;
    
    let width = img.width;
    let height = img.height;
    
    // Scale down if image is too large
    if (width > maxWidth || height > maxHeight) {
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const newScale = Math.min(widthRatio, heightRatio);
      
      width = width * newScale;
      height = height * newScale;
      setScale(newScale);
    } else {
      setScale(1);
    }
    
    setCanvasSize({ width, height });
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background image
    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw bounding boxes for selected elements
    uiElements.forEach(element => {
      if (selectedElements.has(element.id)) {
        const color = getElementColor(element.class);
        const isHovered = hoveredElement === element.id;
        
        drawBoundingBox(ctx, element, color, scale, {
          isHovered,
          showLabel: isHovered,
          opacity: isHovered ? 0.8 : 0.5
        });
      }
    });
    
    // Draw hover tooltip
    if (hoveredElement) {
      drawHoverTooltip(ctx, hoveredElement);
    }
  };

  const drawHoverTooltip = (ctx, elementId) => {
    const element = uiElements.find(el => el.id === elementId);
    if (!element) return;

    const scaledBounds = scaleCoordinates(element.bounds, scale);
    const tooltipX = scaledBounds.x2 + 10;
    const tooltipY = scaledBounds.y1;
    
    // Tooltip content
    const lines = [
      `ID: ${element.id}`,
      `Class: ${element.class.split('.').pop()}`,
      element.text && `Text: "${element.text}"`,
      element.resourceId && `Resource ID: ${element.resourceId.split('/').pop()}`,
      `Clickable: ${element.clickable ? 'Yes' : 'No'}`
    ].filter(Boolean);
    
    // Calculate tooltip size
    const lineHeight = 16;
    const padding = 8;
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width)) + padding * 2;
    const tooltipHeight = lines.length * lineHeight + padding * 2;
    
    // Draw tooltip background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(tooltipX, tooltipY, maxWidth, tooltipHeight);
    
    // Draw tooltip border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(tooltipX, tooltipY, maxWidth, tooltipHeight);
    
    // Draw tooltip text
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    lines.forEach((line, index) => {
      ctx.fillText(line, tooltipX + padding, tooltipY + padding + (index + 1) * lineHeight);
    });
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Find clicked element
    const clickedElement = uiElements.find(element => {
      if (!selectedElements.has(element.id)) return false;
      
      const scaledBounds = scaleCoordinates(element.bounds, scale);
      return (
        clickX >= scaledBounds.x1 &&
        clickX <= scaledBounds.x2 &&
        clickY >= scaledBounds.y1 &&
        clickY <= scaledBounds.y2
      );
    });
    
    if (clickedElement) {
      toggleElement(clickedElement.id);
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Find hovered element
    const hoveredEl = uiElements.find(element => {
      if (!selectedElements.has(element.id)) return false;
      
      const scaledBounds = scaleCoordinates(element.bounds, scale);
      return (
        mouseX >= scaledBounds.x1 &&
        mouseX <= scaledBounds.x2 &&
        mouseY >= scaledBounds.y1 &&
        mouseY <= scaledBounds.y2
      );
    });
    
    setHoveredElement(hoveredEl ? hoveredEl.id : null);
    canvas.style.cursor = hoveredEl ? 'pointer' : 'default';
  };

  const handleCanvasMouseLeave = () => {
    setHoveredElement(null);
    canvasRef.current.style.cursor = 'default';
  };

  if (!uploadedImage) {
    return (
      <div className="canvas-placeholder">
        <div className="placeholder-content">
          <div className="placeholder-icon">📱</div>
          <h3>Upload Mobile Screenshot</h3>
          <p>Upload an image to start visualizing UI elements</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bounding-box-canvas">
      <div className="canvas-header">
        <h3>📱 Screenshot Visualization</h3>
        <div className="canvas-info">
          <span>Scale: {Math.round(scale * 100)}%</span>
          <span>Selected: {selectedElements.size} / {uiElements.length}</span>
        </div>
      </div>
      
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          className="main-canvas"
        />
        
        {!isImageLoaded && (
          <div className="canvas-loading">
            <div className="spinner"></div>
            <p>Loading image...</p>
          </div>
        )}
      </div>
      
      <div className="canvas-controls">
        <button 
          className="zoom-btn"
          onClick={() => setScale(prev => Math.min(prev + 0.1, 2))}
        >
          🔍 Zoom In
        </button>
        <button 
          className="zoom-btn"
          onClick={() => setScale(prev => Math.max(prev - 0.1, 0.3))}
        >
          🔍 Zoom Out
        </button>
        <button 
          className="reset-btn"
          onClick={() => calculateCanvasSize(imageRef.current)}
        >
          🔄 Reset View
        </button>
      </div>
    </div>
  );
};

export default BoundingBoxCanvas;
