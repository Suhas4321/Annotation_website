"""
file_handler.py - Service for processing uploaded JSON/XML UI automation data
Handles parsing, validation, and extraction of UI elements from uploaded files
"""

from typing import Dict, List, Optional
import json
import xml.etree.ElementTree as ET
import re

def process_json_content(data: Dict) -> List[Dict]:
    """
    Process JSON UI automation data and extract UI elements
    Handles Android UI automator dump format and converts to standardized format
    
    Args:
        data: Raw JSON data from UI automator dump
        
    Returns:
        List of processed UI elements with normalized properties
    """
    elements = []
    
    for element_id, element_data in data.items():
        if not isinstance(element_data, dict):
            continue
            
        # Skip elements without bounds (not visible/drawable)
        bounds_str = element_data.get('bounds', '')
        if not bounds_str:
            continue
            
        # Parse bounds coordinates [x1,y1][x2,y2]
        bounds = parse_bounds_string(bounds_str)
        if not bounds:
            continue
            
        # Extract and normalize element properties
        element = {
            'id': str(element_id),
            'bounds': bounds,
            'class': element_data.get('class', ''),
            'text': clean_text_content(element_data.get('text', '')),
            'resourceId': element_data.get('resource-id', ''),
            'contentDesc': element_data.get('content-desc', ''),
            'clickable': str(element_data.get('clickable', 'false')).lower() == 'true',
            'enabled': str(element_data.get('enabled', 'false')).lower() == 'true',
            'visible': str(element_data.get('visible-to-user', 'false')).lower() == 'true',
            'focused': str(element_data.get('focused', 'false')).lower() == 'true',
            'scrollable': str(element_data.get('scrollable', 'false')).lower() == 'true',
            'package': element_data.get('package', ''),
            'index': element_data.get('index', '0'),
            'hint': element_data.get('hint', ''),
            'displayId': element_data.get('display-id', '0'),
            'source': element_data.get('source', 'UiAutomation')
        }
        
        # Calculate element dimensions
        element['width'] = bounds['x2'] - bounds['x1']
        element['height'] = bounds['y2'] - bounds['y1']
        element['centerX'] = bounds['x1'] + element['width'] // 2
        element['centerY'] = bounds['y1'] + element['height'] // 2
        
        # Add element type classification
        element['elementType'] = classify_element_type(element)
        
        # Add importance score for testing priority
        element['testPriority'] = calculate_test_priority(element)
        
        elements.append(element)
    
    # Sort by test priority (most important first)
    elements.sort(key=lambda x: x['testPriority'], reverse=True)
    
    return elements

def parse_bounds_string(bounds_str: str) -> Optional[Dict[str, int]]:
    """
    Parse Android bounds string format: '[x1,y1][x2,y2]'
    
    Args:
        bounds_str: Bounds string from UI automator
        
    Returns:
        Dict with x1, y1, x2, y2 coordinates or None if invalid
    """
    try:
        # Remove brackets and split coordinates
        clean_bounds = bounds_str.replace('[', '').replace(']', ',')
        coords = [int(x.strip()) for x in clean_bounds.split(',') if x.strip()]
        
        if len(coords) >= 4:
            return {
                'x1': coords[0],
                'y1': coords[1], 
                'x2': coords[2],
                'y2': coords[3]
            }
    except (ValueError, IndexError):
        pass
    
    return None

def clean_text_content(text: str) -> str:
    """
    Clean and normalize text content from UI elements
    
    Args:
        text: Raw text content
        
    Returns:
        Cleaned text content
    """
    if not text:
        return ''
        
    # Remove extra whitespace and newlines
    cleaned = re.sub(r'\s+', ' ', text.strip())
    
    # Remove special characters that might break CSV export
    cleaned = cleaned.replace('"', '""')  # Escape quotes for CSV
    
    return cleaned

def classify_element_type(element: Dict) -> str:
    """
    Classify UI element type based on class name and properties
    
    Args:
        element: Processed element data
        
    Returns:
        Element type classification
    """
    class_name = element.get('class', '').lower()
    
    # Button elements
    if ('button' in class_name or 
        'clickable' in class_name or
        element.get('clickable', False)):
        return 'Button'
    
    # Input elements
    elif ('edittext' in class_name or 
          'edit' in class_name or
          'input' in class_name):
        return 'Input'
    
    # Text display elements
    elif ('textview' in class_name or 
          'text' in class_name or
          'label' in class_name):
        return 'Text'
    
    # Image elements
    elif ('imageview' in class_name or 
          'image' in class_name or
          'icon' in class_name):
        return 'Image'
    
    # Layout containers
    elif ('layout' in class_name or 
          'viewgroup' in class_name or
          'container' in class_name):
        return 'Layout'
    
    # List elements
    elif ('recyclerview' in class_name or 
          'listview' in class_name or
          'list' in class_name):
        return 'List'
    
    else:
        return 'Other'

def calculate_test_priority(element: Dict) -> int:
    """
    Calculate testing priority score for UI element
    Higher score = more important for testing
    
    Args:
        element: Processed element data
        
    Returns:
        Priority score (0-10)
    """
    score = 0
    
    # Clickable elements get higher priority
    if element.get('clickable', False):
        score += 5
    
    # Elements with text content get priority
    if element.get('text', '').strip():
        score += 3
    
    # Input elements get high priority
    if element.get('elementType') == 'Input':
        score += 4
    
    # Button elements get high priority
    if element.get('elementType') == 'Button':
        score += 4
    
    # Visible elements get priority
    if element.get('visible', False):
        score += 2
    
    # Enabled elements get priority
    if element.get('enabled', False):
        score += 1
    
    # Elements with resource IDs are easier to test
    if element.get('resourceId', ''):
        score += 2
    
    # Larger elements might be more important
    element_area = element.get('width', 0) * element.get('height', 0)
    if element_area > 10000:  # Large elements
        score += 1
    
    return min(score, 10)  # Cap at 10

def validate_json_structure(data: Dict) -> Dict[str, any]:
    """
    Validate JSON structure and return validation results
    
    Args:
        data: JSON data to validate
        
    Returns:
        Validation result with success status and details
    """
    if not isinstance(data, dict):
        return {
            'valid': False,
            'error': 'Data must be a JSON object/dictionary'
        }
    
    if not data:
        return {
            'valid': False,
            'error': 'JSON data is empty'
        }
    
    # Check for expected UI automator structure
    valid_elements = 0
    total_elements = len(data)
    
    for element_id, element_data in data.items():
        if isinstance(element_data, dict) and element_data.get('bounds'):
            valid_elements += 1
    
    if valid_elements == 0:
        return {
            'valid': False,
            'error': 'No valid UI elements found with bounds information'
        }
    
    return {
        'valid': True,
        'total_elements': total_elements,
        'valid_elements': valid_elements,
        'validation_rate': (valid_elements / total_elements) * 100
    }

def export_elements_to_csv(elements: List[Dict]) -> str:
    """
    Export elements list to CSV format string
    
    Args:
        elements: List of processed UI elements
        
    Returns:
        CSV formatted string
    """
    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    headers = [
        'ID', 'Element Type', 'Class Name', 'Text Content', 'Resource ID',
        'Bounds', 'Width', 'Height', 'Center X', 'Center Y',
        'Clickable', 'Enabled', 'Visible', 'Test Priority', 'Package'
    ]
    writer.writerow(headers)
    
    # Write data rows
    for element in elements:
        bounds = element.get('bounds', {})
        bounds_str = f"[{bounds.get('x1', 0)},{bounds.get('y1', 0)}][{bounds.get('x2', 0)},{bounds.get('y2', 0)}]"
        
        row = [
            element.get('id', ''),
            element.get('elementType', ''),
            element.get('class', ''),
            element.get('text', ''),
            element.get('resourceId', ''),
            bounds_str,
            element.get('width', 0),
            element.get('height', 0),
            element.get('centerX', 0),
            element.get('centerY', 0),
            'Yes' if element.get('clickable', False) else 'No',
            'Yes' if element.get('enabled', False) else 'No',
            'Yes' if element.get('visible', False) else 'No',
            element.get('testPriority', 0),
            element.get('package', '')
        ]
        writer.writerow(row)
    
    return output.getvalue()
