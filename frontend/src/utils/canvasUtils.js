/**
 * canvasUtils.js - Canvas drawing utilities for bounding box visualization
 * Handles all canvas operations, scaling, and drawing functions
 */

// Color mapping for different UI element types
export const getElementColor = (className) => {
  if (!className) return '#95A5A6'; // Gray for unknown
  
  const lowerClass = className.toLowerCase();
  
  // Button-like elements (clickable)
  if (lowerClass.includes('button') || 
      lowerClass.includes('clickable') ||
      className.includes('menu')) {
    return '#FF6B6B'; // Red
  }
  
  // Input/Edit elements
  if (lowerClass.includes('edittext') || 
      lowerClass.includes('edit') ||
      lowerClass.includes('input')) {
    return '#4ECDC4'; // Teal
  }
  
  // Text elements
  if (lowerClass.includes('textview') || 
      lowerClass.includes('text') ||
      lowerClass.includes('label')) {
    return '#45B7D1'; // Blue
  }
  
  // Image elements
  if (lowerClass.includes('imageview') || 
      lowerClass.includes('image') ||
      lowerClass.includes('icon')) {
    return '#96CEB4'; // Green
  }
  
  // ViewGroup containers
  if (lowerClass.includes('viewgroup') || 
      lowerClass.includes('group') ||
      lowerClass.includes('linear')) {
    return '#FFEAA7'; // Yellow
  }
  
  // FrameLayout containers
  if (lowerClass.includes('framelayout') || 
      lowerClass.includes('frame') ||
      lowerClass.includes('relative')) {
    return '#DDA0DD'; // Purple
  }
  
  return '#95A5A6'; // Gray for others
};

// Draw bounding box with advanced styling options
export const drawBoundingBox = (ctx, element, color, scale, options = {}) => {
  if (!element || !element.bounds) return;

  const {
    isHovered = false,
    showLabel = false,
    opacity = 0.3,
    showId = true,
    dashedBorder = false
  } = options;

  // Scale coordinates
  const scaledBounds = scaleCoordinates(element.bounds, scale);
  const { x1, y1, x2, y2 } = scaledBounds;
  const width = x2 - x1;
  const height = y2 - y1;

  // Skip tiny elements
  if (width < 2 || height < 2) return;

  // Save canvas state
  ctx.save();

  // Draw filled rectangle with opacity
  if (opacity > 0) {
    ctx.fillStyle = hexToRgba(color, opacity);
    ctx.fillRect(x1, y1, width, height);
  }

  // Set border style
  ctx.strokeStyle = color;
  ctx.lineWidth = isHovered ? 3 : 2;
  
  if (dashedBorder) {
    ctx.setLineDash([5, 5]);
  }

  // Draw border
  ctx.strokeRect(x1, y1, width, height);

  // Draw corner handles for hovered elements
  if (isHovered) {
    drawCornerHandles(ctx, x1, y1, x2, y2, color);
  }

  // Draw label
  if (showLabel && width > 50 && height > 20) {
    drawElementLabel(ctx, element, x1, y1, color, showId);
  }

  // Restore canvas state
  ctx.restore();
};

// Draw corner handles for selected elements
const drawCornerHandles = (ctx, x1, y1, x2, y2, color) => {
  const handleSize = 6;
  const handles = [
    [x1, y1], // top-left
    [x2, y1], // top-right
    [x2, y2], // bottom-right
    [x1, y2]  // bottom-left
  ];

  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  handles.forEach(([x, y]) => {
    ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
    ctx.strokeRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
  });
};

// Draw element label with background
const drawElementLabel = (ctx, element, x, y, color, showId) => {
  const className = element.class ? element.class.split('.').pop() : 'Unknown';
  const text = showId ? `#${element.id} ${className}` : className;
  
  ctx.font = '12px Arial';
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = 14;
  const padding = 4;
  
  // Position label above element if there's space
  const labelY = y > textHeight + padding * 2 ? y - textHeight - padding : y + textHeight + padding;
  
  // Draw label background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(x, labelY - textHeight, textWidth + padding * 2, textHeight + padding * 2);
  
  // Draw label text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + padding, labelY);
};

// Scale coordinate object
export const scaleCoordinates = (bounds, scale) => {
  if (!bounds || typeof bounds !== 'object') return { x1: 0, y1: 0, x2: 0, y2: 0 };
  
  return {
    x1: Math.round((bounds.x1 || 0) * scale),
    y1: Math.round((bounds.y1 || 0) * scale),
    x2: Math.round((bounds.x2 || 0) * scale),
    y2: Math.round((bounds.y2 || 0) * scale)
  };
};

// Convert hex color to rgba
const hexToRgba = (hex, alpha) => {
  // Handle 3-digit hex codes
  if (hex.length === 4) {
    hex = hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Check if point is inside bounds
export const isPointInBounds = (point, bounds, scale = 1) => {
  const scaledBounds = scaleCoordinates(bounds, scale);
  return (
    point.x >= scaledBounds.x1 &&
    point.x <= scaledBounds.x2 &&
    point.y >= scaledBounds.y1 &&
    point.y <= scaledBounds.y2
  );
};

// Calculate canvas dimensions with aspect ratio
export const calculateCanvasDimensions = (imageWidth, imageHeight, maxWidth = 800, maxHeight = 600) => {
  let width = imageWidth;
  let height = imageHeight;
  let scale = 1;

  // Scale down if image is too large
  if (width > maxWidth || height > maxHeight) {
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    scale = Math.min(widthRatio, heightRatio);
    
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  return { width, height, scale };
};

// Clear canvas with optional background color
export const clearCanvas = (canvas, backgroundColor = 'transparent') => {
  const ctx = canvas.getContext('2d');
  
  if (backgroundColor === 'transparent') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};

// Export canvas as image
export const exportCanvasAsImage = (canvas, filename = 'drizz-screenshot', format = 'png') => {
  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = canvas.toDataURL(`image/${format}`);
  link.click();
};
