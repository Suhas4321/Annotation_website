from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from ..services.file_handler import process_json_content, validate_json_structure
import json
import aiofiles

router = APIRouter(prefix="/api", tags=["files"])

@router.post("/table/{table_name}/{id}")
async def upload_json_file(table_name: str, id: str, file: UploadFile = File(...)):
    if file.content_type != 'application/json':
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a JSON file.")
    
    try:
        # Read file content asynchronously
        async with aiofiles.open(file.file.fileno(), mode='r') as f:
            content = await f.read()
        
        json_content = json.loads(content)
        
        # Validate JSON structure
        if not validate_json_structure(json_content):
            raise HTTPException(status_code=400, detail="Invalid JSON structure.")
        
        # Process and store the JSON content
        await process_json_content(table_name, id, json_content)
        
        return JSONResponse(status_code=200, content={"message": "File uploaded and processed successfully."})
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Error decoding JSON file.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")