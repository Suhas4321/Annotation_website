"""
file_routes.py - File upload and processing routes
Handles JSON/XML UI automation data upload and processing
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from ..services.file_handler import process_json_content, validate_json_structure
import json
import aiofiles

router = APIRouter(prefix="/api", tags=["files"])

@router.post("/upload-json")
async def upload_json_file(file: UploadFile = File(...)):
    """
    Upload and parse JSON/XML UI automation data from file
    Returns processed UI elements with bounding boxes
    """
    try:
        # Validate file type
        if not (file.filename.endswith('.json') or file.filename.endswith('.xml')):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Please upload JSON or XML files only."
            )
        
        # Read file content
        content = await file.read()
        
        # Parse JSON content
        try:
            if file.filename.endswith('.json'):
                data = json.loads(content.decode('utf-8'))
            else:
                # Basic XML to dict conversion (you can enhance this)
                import xml.etree.ElementTree as ET
                root = ET.fromstring(content.decode('utf-8'))
                data = xml_to_dict(root)
                
        except (json.JSONDecodeError, ET.ParseError) as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file format: {str(e)}"
            )
        
        # Process UI elements
        elements = process_json_content(data)
        
        return JSONResponse({
            "success": True,
            "elements": elements,
            "total_elements": len(elements),
            "filename": file.filename,
            "message": f"Successfully processed {len(elements)} UI elements"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"File processing failed: {str(e)}"
        )

@router.post("/process-json")
async def process_json_paste(request_data: dict):
    """
    Process JSON content pasted directly (not from file)
    """
    try:
        content = request_data.get('content', '')
        if not content:
            raise HTTPException(
                status_code=400,
                detail="No JSON content provided"
            )
        
        # Parse JSON
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON format: {str(e)}"
            )
        
        # Process UI elements
        elements = process_json_content(data)
        
        return JSONResponse({
            "success": True,
            "elements": elements,
            "total_elements": len(elements),
            "source": "paste",
            "message": f"Successfully processed {len(elements)} UI elements from pasted content"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"JSON processing failed: {str(e)}"
        )

def xml_to_dict(element):
    """Convert XML element to dictionary (basic implementation)"""
    result = {}
    result['tag'] = element.tag
    result['text'] = element.text
    result['attrib'] = element.attrib
    
    children = list(element)
    if children:
        result['children'] = [xml_to_dict(child) for child in children]
    
    return result

@router.get("/export")
async def export_elements(elements: list, format: str = "csv"):
    """
    Export processed elements in specified format
    """
    try:
        if format == "csv":
            # Generate CSV content
            csv_content = generate_csv(elements)
            return JSONResponse({
                "success": True,
                "content": csv_content,
                "format": "csv",
                "message": "Elements exported successfully"
            })
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported export format. Use 'csv'."
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Export failed: {str(e)}"
        )

def generate_csv(elements):
    """Generate CSV content from elements list"""
    import csv
    import io
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['ID', 'Class', 'Text', 'Resource-ID', 'Bounds', 'Clickable', 'Enabled', 'Visible'])
    
    # Data rows
    for element in elements:
        bounds = element.get('bounds', {})
        bounds_str = f"[{bounds.get('x1', 0)},{bounds.get('y1', 0)}][{bounds.get('x2', 0)},{bounds.get('y2', 0)}]"
        
        writer.writerow([
            element.get('id', ''),
            element.get('class', ''),
            element.get('text', ''),
            element.get('resourceId', ''),
            bounds_str,
            element.get('clickable', False),
            element.get('enabled', False),
            element.get('visible', False)
        ])
    
    return output.getvalue()
