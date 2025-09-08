"""
run_drizz.py - Single startup script for Drizz UI Testing Tool (React SPA)
No more Flask app - everything integrated into FastAPI on port 8000
"""

import subprocess
import sys
import os
import threading
import time
from pathlib import Path

def print_drizz_logo():
    print("""
    ██████╗ ██████╗ ██╗███████╗███████╗
    ██╔══██╗██╔══██╗██║╚══███╔╝╚══███╔╝
    ██║  ██║██████╔╝██║  ███╔╝   ███╔╝ 
    ██║  ██║██╔══██╗██║ ███╔╝   ███╔╝  
    ██████╔╝██║  ██║██║███████╗███████╗
    ╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚══════╝
    
    🎯 Drizz UI Testing Tool - React SPA Edition
    🚀 Starting all services...
    """)

def initialize_database():
    """Initialize database tables"""
    try:
        sys.path.append('backend')
        from database import Base, engine
        
        print("⏳ Initializing database...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified")
        return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

def main():
    print_drizz_logo()
    
    backend_dir = Path("backend")
    frontend_dir = Path("frontend")
    
    if not backend_dir.exists() or not frontend_dir.exists():
        print("❌ Please run from drizz_ui_tester directory")
        return
    
    if not initialize_database():
        return
    
    print("🔍 Checking dependencies...")
    
    # Check Python dependencies
    try:
        import uvicorn
        import fastapi
        import sqlalchemy
        print("✅ Python dependencies OK")
    except ImportError as e:
        print(f"❌ Missing Python dependencies: {e}")
        print("💻 Run: pip install -r backend/requirements.txt")
        return
    
    # Check React Router dependency
    print("🔍 Checking React dependencies...")
    try:
        node_modules_path = frontend_dir / "node_modules" / "react-router-dom"
        if not node_modules_path.exists():
            print("⚠️  React Router not found!")
            print("💻 Run: cd frontend && npm install react-router-dom")
            return
        print("✅ React Router dependency OK")
    except Exception as e:
        print(f"❌ Failed to check React dependencies: {e}")
    
    # Check npm
    try:
        result = subprocess.run(["npm", "--version"], 
                              capture_output=True, 
                              text=True, 
                              shell=True)
        if result.returncode == 0:
            print("✅ npm is available")
        else:
            raise subprocess.CalledProcessError(result.returncode, "npm")
    except:
        print("❌ npm not found! Please install Node.js")
        return
    
    def run_backend():
        print("🔧 Starting FastAPI server with JSON API endpoints...")
        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"]
        subprocess.run(cmd, cwd=backend_dir)
    
    def run_frontend():
        time.sleep(3)  # Wait for backend to start
        print("⚛️ Starting React frontend server with SPA routing...")
        subprocess.run("npm start", cwd=frontend_dir, shell=True)
    
    print("🚀 Starting unified React SPA...")
    print("📊 Services will be available at:")
    print("   - Main App (SPA): http://localhost:3000")
    print("   - API Backend: http://localhost:8000")
    print("   - Database Browser (In-App): http://localhost:3000/database")
    print("   - Projects List (In-App): http://localhost:3000/database/projects")
    print("")
    print("✨ Features:")
    print("   - ✅ Single Page Application (SPA) navigation")
    print("   - ✅ No new tab openings")
    print("   - ✅ Browser back/forward support")
    print("   - ✅ Seamless annotation ↔ database navigation")
    
    # Start backend in daemon thread
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    # Start frontend (this blocks and keeps the script running)
    run_frontend()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Stopping all Drizz servers...")
        print("👋 Thank you for using Drizz UI Testing Tool!")
