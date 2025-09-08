"""
Drizz UI Testing Tool - FastAPI Backend with PostgreSQL and JSON APIs
Updated for React SPA integration - No HTML page serving
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import json
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime
import uvicorn
import hashlib
import shortuuid
import psycopg2
import psycopg2.extras

# Import your database models and session
from database import Base, engine, SessionLocal, get_db, OriginalInputs, FinalisedDatapoints, DATABASE_URL

# Pydantic Models for String IDs
class AnnotationRequest(BaseModel):
    project_id: str
    annotations: dict

# Initialize FastAPI
app = FastAPI(
    title="Drizz UI Testing Tool API",
    description="Backend API with PostgreSQL for React SPA",
    version="4.0.0"
)

# Create database tables on startup
Base.metadata.create_all(bind=engine)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure ShortUUID
shortuuid.set_alphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

def generate_unique_project_id(image_base64: str, label_map_json: dict, include_timestamp: bool = True) -> str:
    """Generate unique ID with optional timestamp nonce"""
    if include_timestamp:
        timestamp_nonce = str(datetime.utcnow().timestamp())
        image_base64 = f"{image_base64}::{timestamp_nonce}"
    
    image_hash = hashlib.sha256(image_base64.encode('utf-8')).hexdigest()
    label_json_str = json.dumps(label_map_json, sort_keys=True, separators=(',', ':'))
    label_hash = hashlib.sha256(label_json_str.encode('utf-8')).hexdigest()
    combined_data = f"{image_hash}:{label_hash}"
    unique_id = hashlib.sha256(combined_data.encode('utf-8')).hexdigest()
    return unique_id

def generate_short_id(full_hash_id: str) -> str:
    """Generate short, user-friendly ID"""
    short_seed = full_hash_id[:16]
    short_id = shortuuid.uuid(name=short_seed)[:8].upper()
    return f"DZ{short_id}"

def get_db_connection():
    """Get PostgreSQL connection"""
    return psycopg2.connect(DATABASE_URL)

# ================================
# 🎯 MAIN API ENDPOINTS
# ================================

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "🎯 Drizz API running for React SPA!", "status": "healthy"}

@app.post("/api/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Upload and process mobile screenshot image"""
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        image_data = await file.read()
        image = Image.open(BytesIO(image_data))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        width, height = image.size
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        return JSONResponse({
            "success": True,
            "image_data": f"data:image/png;base64,{img_base64}",
            "width": width,
            "height": height,
            "filename": file.filename,
            "message": "✅ Image uploaded successfully"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@app.post("/api/upload-json")
async def upload_json(
    file: UploadFile = File(...),
    image_data: Optional[str] = None,
    image_filename: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Upload JSON with timestamp nonce + Short ID generation"""
    try:
        content = await file.read()
        data = json.loads(content.decode('utf-8'))
        
        # Generate unique hash-based ID
        project_id = generate_unique_project_id(image_data or "", data, include_timestamp=True)
        short_id = generate_short_id(project_id)
        
        # Process UI elements
        elements = []
        for element_id, element_data in data.items():
            if isinstance(element_data, dict) and 'bounds' in element_data:
                bounds_str = element_data.get('bounds', '')
                if bounds_str:
                    bounds_str = bounds_str.replace('[', '').replace(']', ',')
                    coords = [int(x) for x in bounds_str.split(',') if x]
                    
                    if len(coords) >= 4:
                        element = {
                            'id': element_id,
                            'bounds': {'x1': coords[0], 'y1': coords[1], 'x2': coords[2], 'y2': coords[3]},
                            'class': element_data.get('class', ''),
                            'text': element_data.get('text', ''),
                            'resource_id': element_data.get('resource-id', ''),
                            'clickable': element_data.get('clickable', 'false') == 'true',
                            'enabled': element_data.get('enabled', 'false') == 'true',
                            'visible': element_data.get('visible-to-user', 'false') == 'true'
                        }
                        elements.append(element)
        
        # Save to database
        original = OriginalInputs(
            id=project_id,
            short_id=short_id,
            image=image_data or "",
            label_map_json=data,
            filename=image_filename or file.filename,
            created_at=datetime.utcnow()
        )
        db.add(original)
        db.commit()
        
        return JSONResponse({
            "success": True,
            "elements": elements,
            "total_elements": len(elements),
            "filename": file.filename,
            "project_id": project_id,
            "short_id": short_id,
            "message": f"✅ Project {short_id} created with {len(elements)} elements"
        })
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"JSON processing failed: {str(e)}")

@app.post("/api/save-annotations")
async def save_annotations(request: AnnotationRequest, db: Session = Depends(get_db)):
    """Save user's curated annotations"""
    try:
        annotation_content = json.dumps(request.annotations, sort_keys=True)
        annotation_id = hashlib.sha256(f"{request.project_id}:{annotation_content}".encode()).hexdigest()
        annotation_short_id = generate_short_id(annotation_id)
        
        existing = db.query(FinalisedDatapoints).filter(
            FinalisedDatapoints.original_datapoint_id == request.project_id
        ).first()
        
        if existing:
            existing.final_label_map = request.annotations
            existing.updated_at = datetime.utcnow()
            message = f"✅ Annotations updated for project {existing.short_id or 'N/A'}"
        else:
            finalised = FinalisedDatapoints(
                id=annotation_id,
                short_id=annotation_short_id,
                original_datapoint_id=request.project_id,
                final_label_map=request.annotations,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(finalised)
            message = f"✅ Annotations saved as {annotation_short_id}"
        
        db.commit()
        return JSONResponse({"success": True, "message": message, "annotation_short_id": annotation_short_id})
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Annotation save failed: {str(e)}")

@app.get("/api/get-saved-annotations/{project_id}")
async def get_saved_annotations(project_id: str, db: Session = Depends(get_db)):
    """Retrieve saved annotations for a project"""
    try:
        saved = db.query(FinalisedDatapoints).filter(
            FinalisedDatapoints.original_datapoint_id == project_id
        ).first()
        
        if saved:
            return JSONResponse({
                "success": True,
                "annotations": saved.final_label_map,
                "short_id": saved.short_id,
                "updated_at": saved.updated_at.isoformat()
            })
        else:
            return JSONResponse({"success": False, "message": "No saved annotations found"})
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retrieval failed: {str(e)}")

@app.get("/api/list-projects")
async def list_projects(db: Session = Depends(get_db)):
    """List all annotation projects"""
    try:
        projects = db.query(OriginalInputs).order_by(OriginalInputs.created_at.desc()).all()
        
        project_list = []
        for project in projects:
            has_annotations = db.query(FinalisedDatapoints).filter(
                FinalisedDatapoints.original_datapoint_id == project.id
            ).first() is not None
            
            project_list.append({
                "id": project.id,
                "short_id": project.short_id,
                "filename": project.filename,
                "created_at": project.created_at.isoformat(),
                "has_annotations": has_annotations,
                "status": "✅ Annotated" if has_annotations else "⏳ Pending"
            })
        
        return JSONResponse({"success": True, "projects": project_list, "total_projects": len(project_list)})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Project listing failed: {str(e)}")

# ================================
# 🗄️ DATABASE API ENDPOINTS (JSON ONLY)
# ================================

@app.get("/api/db/stats")
async def get_database_stats():
    """Get database statistics as JSON"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT COUNT(*) FROM original_inputs")
        total_projects = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM finalised_datapoints")
        annotated_projects = cur.fetchone()[0]
        
        conn.close()
        
        return {
            "total_projects": total_projects,
            "annotated_projects": annotated_projects,
            "completion_rate": (annotated_projects/total_projects*100) if total_projects > 0 else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/db/recent-projects")
async def get_recent_projects():
    """Get recent projects as JSON"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT id, short_id, filename, created_at 
            FROM original_inputs 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        projects = cur.fetchall()
        conn.close()
        
        project_list = []
        for project in projects:
            project_list.append({
                "id": project[0],
                "short_id": project[1],
                "filename": project[2],
                "created_at": project[3].isoformat() if project[3] else None
            })
        
        return {"projects": project_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 Starting Drizz API for React SPA on port 8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
