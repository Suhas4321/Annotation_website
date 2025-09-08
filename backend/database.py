"""
database.py - PostgreSQL with Hash IDs + Short Display IDs + Timestamp Nonce
"""

from sqlalchemy import create_engine, Column, String, JSON, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import hashlib
import json
import os
import shortuuid
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set!")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Configure shortuuid for consistent short IDs
shortuuid.set_alphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

def generate_unique_project_id(image_base64: str, label_map_json: dict, include_timestamp: bool = True) -> str:
    """
    Generate unique ID with optional timestamp nonce for multiple uploads
    """
    # Add timestamp nonce to make each upload unique
    if include_timestamp:
        timestamp_nonce = str(datetime.utcnow().timestamp())
        image_base64 = f"{image_base64}::{timestamp_nonce}"
    
    # Hash the image base64 (with nonce)
    image_hash = hashlib.sha256(image_base64.encode('utf-8')).hexdigest()
    
    # Hash the label map JSON (sort keys for consistency)
    label_json_str = json.dumps(label_map_json, sort_keys=True, separators=(',', ':'))
    label_hash = hashlib.sha256(label_json_str.encode('utf-8')).hexdigest()
    
    # Combine both hashes and create final unique ID
    combined_data = f"{image_hash}:{label_hash}"
    unique_id = hashlib.sha256(combined_data.encode('utf-8')).hexdigest()
    
    return unique_id

def generate_short_id(full_hash_id: str) -> str:
    """
    Generate short, user-friendly ID from full hash
    """
    # Use first 16 characters of hash + shortuuid for consistency
    short_seed = full_hash_id[:16]
    short_id = shortuuid.uuid(name=short_seed)[:8].upper()
    return f"DZ{short_id}"  # Prefix with "DZ" for Drizz

# Updated Database Models with Short Display IDs
class OriginalInputs(Base):
    __tablename__ = 'original_inputs'
    
    id = Column(String, primary_key=True, index=True)  # Full hash ID
    short_id = Column(String, unique=True, index=True)  # Short display ID
    image = Column(String)  # Base64 image data
    label_map_json = Column(JSON)  # Original UI automation JSON
    filename = Column(String)  # Original filename
    created_at = Column(DateTime, default=datetime.utcnow)

class FinalisedDatapoints(Base):
    __tablename__ = 'finalised_datapoints'
    
    id = Column(String, primary_key=True, index=True)  # Auto-generated hash ID
    short_id = Column(String, unique=True, index=True)  # Short display ID
    original_datapoint_id = Column(String, index=True)  # FK to original_inputs.id
    final_label_map = Column(JSON)  # User's curated annotations
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Add indexes for performance
Index('idx_original_inputs_short_id', OriginalInputs.short_id)
Index('idx_finalised_datapoints_short_id', FinalisedDatapoints.short_id)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
