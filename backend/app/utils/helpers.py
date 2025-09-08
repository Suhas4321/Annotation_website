"""
helper.py - Helper utilities for Drizz backend
"""

def format_response(success: bool, data: dict = None, message: str = '') -> dict:
    """Standardize API response format"""
    return {
        'success': success,
        'data': data if data else {},
        'message': message
    }

def validate_file_extension(filename: str, allowed_extensions: list) -> bool:
    """Check if file extension is in allowed list"""
    return any(filename.lower().endswith(ext) for ext in allowed_extensions)

def parse_bounds_string(bounds_str: str) -> dict:
    """Parse Android bounds string [x1,y1][x2,y2] to coordinates"""
    try:
        # Remove brackets and split
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
    
    return {}

def calculate_element_area(bounds: dict) -> int:
    """Calculate area of UI element from bounds"""
    if not bounds or not all(k in bounds for k in ['x1', 'y1', 'x2', 'y2']):
        return 0
    
    width = bounds['x2'] - bounds['x1']
    height = bounds['y2'] - bounds['y1']
    return max(0, width * height)

def is_element_visible(element: dict) -> bool:
    """Check if UI element is visible and has reasonable size"""
    if not element.get('visible', False):
        return False
    
    bounds = element.get('bounds', {})
    area = calculate_element_area(bounds)
    
    # Element should have some area to be considered visible
    return area > 0

def classify_element_type(class_name: str) -> str:
    """Classify UI element type from Android class name"""
    if not class_name:
        return 'Other'
    
    class_lower = class_name.lower()
    
    if 'button' in class_lower or 'clickable' in class_lower:
        return 'Button'
    elif 'edittext' in class_lower or 'edit' in class_lower:
        return 'Input'
    elif 'textview' in class_lower or 'text' in class_lower:
        return 'Text'
    elif 'imageview' in class_lower or 'image' in class_lower:
        return 'Image'
    elif 'layout' in class_lower or 'viewgroup' in class_lower:
        return 'Layout'
    else:
        return 'Other'
