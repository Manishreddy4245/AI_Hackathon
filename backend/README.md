# PlaceMind API - FastAPI + Motor (MongoDB)

FastAPI backend service for PlaceMind AI Campus Placement Operations & Interview Coordination Agent.

## Setup Instructions

1. **Create & Activate Virtual Environment**:
   ```bash
   python -m venv .venv
   # Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Configuration**:
   Ensure `.env` exists with:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DATABASE=placemind
   FRONTEND_URL=http://localhost:5173
   ```

4. **Run Application**:
   ```bash
   uvicorn app.main:app --reload --port 8001
   ```

5. **API Documentation**:
   - Swagger UI: [http://localhost:8001/docs](http://localhost:8001/docs)
   - ReDoc UI: [http://localhost:8001/redoc](http://localhost:8001/redoc)
