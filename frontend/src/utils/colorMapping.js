/**
 * colorMapping.js - Element type classification and color mapping
 * Handles UI element categorization and color assignment logic
 */

// Main color palette for UI elements
export const COLOR_PALETTE = {
  BUTTON: '#FF6B6B',      // Red - Interactive elements
  INPUT: '#4ECDC4',       // Teal - Input fields
  TEXT: '#45B7D1',        // Blue - Text elements
  IMAGE: '#96CEB4',       // Green - Images and icons
  CONTAINER: '#FFEAA7',   // Yellow - ViewGroups
  LAYOUT: '#DDA0DD',      // Purple - Layouts
  OTHER: '#95A5A6'        // Gray - Unknown/Other
};

// Element type classification based on Android class names
export const getElementType = (className) => {
  if (!className) return 'Other';
  
  const lowerClass = className.toLowerCase();
  
  // Button and interactive elements
  if (lowerClass.includes('button') ||
      lowerClass.includes('clickable') ||
      lowerClass.includes('menu') ||
      lowerClass.includes('tab') ||
      lowerClass.includes('chip')) {
    return 'Button';
  }
  
  // Input and editable elements
  if (lowerClass.includes('edittext') ||
      lowerClass.includes('edit') ||
      lowerClass.includes('input') ||
      lowerClass.includes('search') ||
      lowerClass.includes('field')) {
    return 'EditText';
  }
  
  // Text display elements
  if (lowerClass.includes('textview') ||
      lowerClass.includes('text') ||
      lowerClass.includes('label') ||
      lowerClass.includes('title')) {
    return 'TextView';
  }
  
  // Image and visual elements
  if (lowerClass.includes('imageview') ||
      lowerClass.includes('image') ||
      lowerClass.includes('icon') ||
      lowerClass.includes('avatar') ||
      lowerClass.includes('photo')) {
    return 'ImageView';
  }
  
  // ViewGroup containers
  if (lowerClass.includes('viewgroup') ||
      lowerClass.includes('group') ||
      lowerClass.includes('linearlayout') ||
      lowerClass.includes('linear') ||
      lowerClass.includes('recycler') ||
      lowerClass.includes('scroll')) {
    return 'ViewGroup';
  }
  
  // Layout containers
  if (lowerClass.includes('framelayout') ||
      lowerClass.includes('frame') ||
      lowerClass.includes('relativelayout') ||
      lowerClass.includes('relative') ||
      lowerClass.includes('constraint') ||
      lowerClass.includes('coordinator') ||
      lowerClass.includes('drawer')) {
    return 'FrameLayout';
  }
  
  return 'Other';
};

// Get color for element based on its type
export const getElementColor = (className) => {
  const type = getElementType(className);
  
  switch (type) {
    case 'Button':
      return COLOR_PALETTE.BUTTON;
    case 'EditText':
      return COLOR_PALETTE.INPUT;
    case 'TextView':
      return COLOR_PALETTE.TEXT;
    case 'ImageView':
      return COLOR_PALETTE.IMAGE;
    case 'ViewGroup':
      return COLOR_PALETTE.CONTAINER;
    case 'FrameLayout':
      return COLOR_PALETTE.LAYOUT;
    default:
      return COLOR_PALETTE.OTHER;
  }
};

// Enhanced element classification with additional properties
export const classifyElement = (element) => {
  const type = getElementType(element.class);
  const color = getElementColor(element.class);
  
  return {
    ...element,
    type,
    color,
    category: getCategoryFromType(type),
    priority: getElementPriority(type, element),
    isInteractive: isInteractiveElement(type, element),
    description: getElementDescription(type)
  };
};

// Get category grouping for element types
const getCategoryFromType = (type) => {
  switch (type) {
    case 'Button':
      return 'Interactive';
    case 'EditText':
      return 'Input';
    case 'TextView':
      return 'Content';
    case 'ImageView':
      return 'Media';
    case 'ViewGroup':
    case 'FrameLayout':
      return 'Layout';
    default:
      return 'Other';
  }
};

// Get priority for element (higher = more important for testing)
const getElementPriority = (type, element) => {
  // Base priority by type
  let priority = 1;
  
  switch (type) {
    case 'Button':
      priority = 5;
      break;
    case 'EditText':
      priority = 4;
      break;
    case 'TextView':
      priority = element.text ? 3 : 2;
      break;
    case 'ImageView':
      priority = 2;
      break;
    default:
      priority = 1;
  }
  
  // Boost priority for clickable elements
  if (element.clickable === 'true') {
    priority += 2;
  }
  
  // Boost priority for elements with text content
  if (element.text && element.text.trim()) {
    priority += 1;
  }
  
  return Math.min(priority, 7); // Cap at 7
};

// Check if element is interactive
const isInteractiveElement = (type, element) => {
  return (
    type === 'Button' ||
    type === 'EditText' ||
    element.clickable === 'true' ||
    element.focusable === 'true'
  );
};

// Get human-readable description for element type
const getElementDescription = (type) => {
  const descriptions = {
    Button: 'Interactive buttons and clickable elements',
    EditText: 'Text input fields and editable areas',
    TextView: 'Text labels and content display',
    ImageView: 'Images, icons, and visual elements',
    ViewGroup: 'Layout containers and grouping elements',
    FrameLayout: 'Frame-based layout containers',
    Other: 'Miscellaneous UI components'
  };
  
  return descriptions[type] || 'Unknown element type';
};

// Get statistics for element collection
export const getElementStatistics = (elements) => {
  const stats = {
    total: elements.length,
    byType: {},
    byCategory: {},
    interactive: 0,
    withText: 0,
    visible: 0,
    enabled: 0
  };
  
  elements.forEach(element => {
    const classified = classifyElement(element);
    
    // Count by type
    stats.byType[classified.type] = (stats.byType[classified.type] || 0) + 1;
    
    // Count by category
    stats.byCategory[classified.category] = (stats.byCategory[classified.category] || 0) + 1;
    
    // Count special properties
    if (classified.isInteractive) stats.interactive++;
    if (element.text && element.text.trim()) stats.withText++;
    if (element.visible === 'true') stats.visible++;
    if (element.enabled === 'true') stats.enabled++;
  });
  
  return stats;
};

// Filter elements by type or category
export const filterElementsByType = (elements, type) => {
  return elements.filter(element => getElementType(element.class) === type);
};

export const filterElementsByCategory = (elements, category) => {
  return elements.filter(element => {
    const type = getElementType(element.class);
    return getCategoryFromType(type) === category;
  });
};

// Generate CSS color variables for consistent theming
export const generateCSSColorVariables = () => {
  return Object.entries(COLOR_PALETTE)
    .map(([key, color]) => `--color-${key.toLowerCase()}: ${color};`)
    .join('\n');
};
