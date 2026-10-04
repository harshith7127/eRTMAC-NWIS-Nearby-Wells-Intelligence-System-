"""
NWIS FastAPI Application — Main Entrypoint
Exposes Canonical Drilling Intelligence APIs for nearby-wells queries, stratigraphy, evidence search, Place Query, Lookahead Rule Engine, Telemetry, and ML Evaluation.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .db import init_db
from .routers import (
    health, wells, events, reports, place, offset, lookahead, telemetry,
    ml_evaluation, knowledge, workspaces, surfaces, faults, reservoirs, terrain,
    geology, locations
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema on startup
    init_db()
    yield


app = FastAPI(
    title="NWIS — Nearby Wells Intelligence System API",
    description="Canonical Drilling Intelligence & Offset Well Analysis Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Development CORS configuration restricted to local frontend hosts
ALLOWED_ORIGINS = [
    "http://localhost:4174",
    "http://127.0.0.1:4174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:4175",
    "http://127.0.0.1:4175",
    "http://localhost:4176",
    "http://127.0.0.1:4176"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"]
)

# Mount Routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(wells.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(place.router, prefix="/api")
app.include_router(offset.router, prefix="/api")
app.include_router(lookahead.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")
app.include_router(ml_evaluation.router, prefix="/api")
app.include_router(knowledge.router, prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(surfaces.router, prefix="/api")
app.include_router(faults.router, prefix="/api")
app.include_router(reservoirs.router, prefix="/api")
app.include_router(terrain.router, prefix="/api")
app.include_router(geology.router, prefix="/api")
app.include_router(locations.router, prefix="/api")

# Mount Legacy Prototype Archive under /legacy
legacy_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "public", "legacy")
if os.path.exists(legacy_dir):
    app.mount("/legacy", StaticFiles(directory=legacy_dir, html=True), name="legacy")


@app.get("/")
def root():
    return {
        "system": "NWIS — Nearby Wells Intelligence System",
        "status": "operational",
        "docs": "/docs",
        "api_prefix": "/api"
    }
