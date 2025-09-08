"""
image_routes.py - Image upload and processing routes
Handles mobile screenshot image upload with processing and validation
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from ..services.image_processor import process_uploaded_image, validate_image, resize_image_if_needed
from PIL import Image
from io import BytesIO
import base64
import aiofiles

router = APIRouter(prefix="/api", tags=["images"])

@router.post("/upload-image")
async def upload_mobile_screenshot(file: UploadFile = File(...)):
    """
    Upload and process mobile screenshot image
    Returns base64 encoded image with metadata for frontend display
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (PNG, JPG, JPEG, WebP)"
            )
        
        # Check file size (10MB limit)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        file_size = 0
        content_chunks = []
        
        # Read file in chunks to check size
        while chunk := await file.read(1024):
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="File too large. Maximum size is 10MB."
                )
            content_chunks.append(chunk)
        
        # Combine chunks
        image_data = b''.join(content_chunks)
        
        # Process image
        processed_result = process_uploaded_image(image_data, file.filename)
        
        if not processed_result['success']:
            raise HTTPException(
                status_code=400,
                detail=processed_result['error']
            )
        
        return JSONResponse({
            "success": True,
            "image_data": processed_result['image_base64'],
            "width": processed_result['width'],
            "height": processed_result['height'],
            "filename": processed_result['filename'],
            "file_size": len(image_data),
            "format": processed_result['format'],
            "message": "Image uploaded and processed successfully"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Image processing failed: {str(e)}"
        )

@router.post("/process-image-base64")
async def process_base64_image(request_data: dict):
    """
    Process base64 encoded image (alternative upload method)
    """
    try:
        base64_data = request_data.get('image_data', '')
        filename = request_data.get('filename', 'uploaded_image.png')
        
        if not base64_data:
            raise HTTPException(
                status_code=400,
                detail="No image data provided"
            )
        
        # Remove data URL prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        # Decode base64
        try:
            image_bytes = base64.b64decode(base64_data)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail="Invalid base64 image data"
            )
        
        # Process image
        processed_result = process_uploaded_image(image_bytes, filename)
        
        if not processed_result['success']:
            raise HTTPException(
                status_code=400,
                detail=processed_result['error']
            )
        
        return JSONResponse({
            "success": True,
            "image_data": processed_result['image_base64'],
            "width": processed_result['width'],
            "height": processed_result['height'],
            "filename": processed_result['filename'],
            "format": processed_result['format'],
            "message": "Base64 image processed successfully"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Base64 image processing failed: {str(e)}"
        )

@router.get("/image-info/{image_id}")
async def get_image_info(image_id: str):
    """
    Get information about previously uploaded image (if implementing image storage)
    """
    # This would require implementing image storage/database
    # For now, return placeholder
    return JSONResponse({
        "success": True,
        "image_id": image_id,
        "message": "Image info endpoint (placeholder)"
    })

@router.delete("/image/{image_id}")
async def delete_uploaded_image(image_id: str):
    """
    Delete previously uploaded image (if implementing image storage)
    """
    # This would require implementing image storage/database
    # For now, return placeholder
    return JSONResponse({
        "success": True,
        "image_id": image_id,
        "message": "Image deletion endpoint (placeholder)"
    })

# Health check for image service
@router.get("/images/health")
async def image_service_health():
    """Health check for image processing service"""
    return JSONResponse({
        "service": "image_processor",
        "status": "healthy",
        "supported_formats": ["PNG", "JPG", "JPEG", "WebP"],
        "max_file_size": "10MB"
    })
