/**
 * ElementChecklist.jsx - Interactive UI Elements List
 * Searchable checklist with color-coded element types and bulk operations
 */

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../App';
import { getElementType, getElementColor } from '../utils/colorMapping';

const ElementChecklist = () => {
  const { uiElements, selectedElements, toggleElement, selectAllElements, deselectAllElements } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('id');

  // Filter and sort elements
  const filteredElements = useMemo(() => {
    let filtered = uiElements.filter(element => {
      // Search filter
      const searchMatch = !searchTerm || 
        element.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (element.text && element.text.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (element.class && element.class.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (element.resourceId && element.resourceId.toLowerCase().includes(searchTerm.toLowerCase()));

      // Type filter
      const typeMatch = filterType === 'all' || getElementType(element.class) === filterType;

      return searchMatch && typeMatch;
    });

    // Sort elements
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'id':
          return parseInt(a.id) - parseInt(b.id);
        case 'type':
          return getElementType(a.class).localeCompare(getElementType(b.class));
        case 'text':
          return (a.text || '').localeCompare(b.text || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [uiElements, searchTerm, filterType, sortBy]);

  const selectedCount = filteredElements.filter(el => selectedElements.has(el.id)).length;
  const elementTypes = [...new Set(uiElements.map(el => getElementType(el.class)))];

  const handleBulkSelect = () => {
    filteredElements.forEach(element => {
      if (!selectedElements.has(element.id)) {
        toggleElement(element.id);
      }
    });
  };

  const handleBulkDeselect = () => {
    filteredElements.forEach(element => {
      if (selectedElements.has(element.id)) {
        toggleElement(element.id);
      }
    });
  };

  return (
    <div className="element-checklist">
      {/* Header with Controls */}
      <div className="checklist-header">
        <h3>📋 UI Elements</h3>
        <div className="element-count">
          {selectedCount} / {filteredElements.length} selected
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="checklist-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-row">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            {elementTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="id">Sort by ID</option>
            <option value="type">Sort by Type</option>
            <option value="text">Sort by Text</option>
          </select>
        </div>

        <div className="bulk-controls">
          <button 
            onClick={handleBulkSelect}
            className="bulk-btn select-all"
            disabled={selectedCount === filteredElements.length}
          >
            ✅ Select Filtered
          </button>
          <button 
            onClick={handleBulkDeselect}
            className="bulk-btn deselect-all"
            disabled={selectedCount === 0}
          >
            ❌ Deselect Filtered
          </button>
        </div>
      </div>

      {/* Elements List */}
      <div className="checklist-list">
        {filteredElements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No elements match your search</p>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="clear-filters-btn">
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="elements-scroll">
            {filteredElements.map(element => {
              const type = getElementType(element.class);
              const color = getElementColor(element.class);
              const isSelected = selectedElements.has(element.id);
              const displayText = element.text || element.class?.split('.').pop() || `Element #${element.id}`;
              
              return (
                <div 
                  key={element.id} 
                  className={`checklist-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleElement(element.id)}
                >
                  <div className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleElement(element.id)}
                      id={`element-${element.id}`}
                    />
                  </div>
                  
                  <div className="item-indicator" style={{ backgroundColor: color }}></div>
                  
                  <div className="item-content">
                    <div className="item-header">
                      <span className="item-id">#{element.id}</span>
                      <span className="item-type">{type}</span>
                    </div>
                    <div className="item-text" title={displayText}>
                      {displayText}
                    </div>
                    {element.bounds && (
                      <div className="item-bounds">
                        [{element.bounds.x1},{element.bounds.y1}] → [{element.bounds.x2},{element.bounds.y2}]
                      </div>
                    )}
                  </div>
                  
                  <div className="item-actions">
                    {element.clickable && <span className="clickable-icon" title="Clickable">👆</span>}
                    {element.visible && <span className="visible-icon" title="Visible">👁️</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ElementChecklist;
