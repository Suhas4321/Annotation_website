/**
 * AppContext.jsx - Global state management context
 */

import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [appState, setAppState] = useState({
    uploadedImage: null,
    imageMetadata: { width: 0, height: 0, filename: '' },
    uiElements: [],
    selectedElements: new Set(),
    isLoading: false,
    error: null
  });

  const updateAppState = (updates) => {
    setAppState(prev => ({ ...prev, ...updates }));
  };

  const toggleElement = (elementId) => {
    setAppState(prev => {
      const newSelected = new Set(prev.selectedElements);
      if (newSelected.has(elementId)) {
        newSelected.delete(elementId);
      } else {
        newSelected.add(elementId);
      }
      return { ...prev, selectedElements: newSelected };
    });
  };

  const selectAllElements = () => {
    setAppState(prev => ({
      ...prev,
      selectedElements: new Set(prev.uiElements.map(el => el.id))
    }));
  };

  const deselectAllElements = () => {
    setAppState(prev => ({
      ...prev,
      selectedElements: new Set()
    }));
  };

  const value = {
    ...appState,
    updateAppState,
    toggleElement,
    selectAllElements,
    deselectAllElements
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
