/**
 * apiClient.js - API communication utilities
 * Handles all backend communication with error handling and loading states
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Generic request method with error handling
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Accept': 'application/json',
      },
    };

    // Merge options
    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);
      
      // Handle HTTP errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Parse JSON response
      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      };
    }
  }

  // Upload image file
  async uploadImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      return { 
        success: false, 
        error: 'Please provide a valid image file' 
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { 
        success: false, 
        error: 'Image file is too large. Please use a file smaller than 10MB.' 
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/upload-image', {
      method: 'POST',
      body: formData,
    });
  }

  // Upload JSON file
  async uploadJsonFile(file) {
    if (!file) {
      return { 
        success: false, 
        error: 'Please provide a valid file' 
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/upload-json', {
      method: 'POST',
      body: formData,
    });
  }

  // Process JSON content (paste)
  async processJsonContent(jsonContent) {
    if (!jsonContent || typeof jsonContent !== 'string') {
      return { 
        success: false, 
        error: 'Please provide valid JSON content' 
      };
    }

    // Validate JSON format
    try {
      JSON.parse(jsonContent);
    } catch (error) {
      return { 
        success: false, 
        error: 'Invalid JSON format. Please check your JSON syntax.' 
      };
    }

    return this.request('/api/process-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: jsonContent }),
    });
  }

  // Get health status
  async getHealthStatus() {
    return this.request('/');
  }

  // Export processed data
  async exportData(selectedElements, format = 'csv') {
    if (!selectedElements || selectedElements.length === 0) {
      return { 
        success: false, 
        error: 'No elements selected for export' 
      };
    }

    return this.request('/api/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        elements: selectedElements,
        format: format,
        timestamp: new Date().toISOString()
      }),
    });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Export convenient methods
export const uploadImage = (file) => apiClient.uploadImage(file);
export const uploadJsonFile = (file) => apiClient.uploadJsonFile(file);
export const processJsonContent = (content) => apiClient.processJsonContent(content);
export const getHealthStatus = () => apiClient.getHealthStatus();
export const exportData = (elements, format) => apiClient.exportData(elements, format);

// Export client instance for advanced usage
export default apiClient;

// Utility functions for API responses
export const handleApiResponse = (response, onSuccess, onError) => {
  if (response.success) {
    onSuccess(response.data);
  } else {
    onError(response.error);
  }
};

export const createApiErrorHandler = (setError, setLoading) => {
  return (error) => {
    if (setError) setError(error);
    if (setLoading) setLoading(false);
    console.error('API Error:', error);
  };
};

// File validation utilities
export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Please use JPEG, PNG, or WebP images.' 
    };
  }

  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'File too large. Please use an image smaller than 10MB.' 
    };
  }

  return { valid: true };
};

export const validateJsonFile = (file) => {
  const validTypes = ['application/json', 'text/json'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!validTypes.includes(file.type) && !file.name.endsWith('.json')) {
    return { 
      valid: false, 
      error: 'Invalid file type. Please use a JSON file.' 
    };
  }

  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'File too large. Please use a JSON file smaller than 5MB.' 
    };
  }

  return { valid: true };
};

// Network status utilities
export const checkNetworkConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/`, { 
      method: 'HEAD',
      cache: 'no-cache'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Retry mechanism for failed requests
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await requestFn();
      if (result.success) {
        return result;
      }
      
      // If it's the last retry, return the failed result
      if (i === maxRetries - 1) {
        return result;
      }
      
    } catch (error) {
      // If it's the last retry, throw the error
      if (i === maxRetries - 1) {
        throw error;
      }
    }
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
  }
};

// Progress tracking for file uploads
export const uploadWithProgress = async (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(Math.round(percentComplete));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({ success: true, data: response });
        } catch (error) {
          resolve({ success: false, error: 'Invalid response format' });
        }
      } else {
        resolve({ 
          success: false, 
          error: `Upload failed with status ${xhr.status}` 
        });
      }
    });

    xhr.addEventListener('error', () => {
      resolve({ success: false, error: 'Network error during upload' });
    });

    xhr.open('POST', `${API_BASE_URL}/api/upload-image`);
    xhr.send(formData);
  });
};
