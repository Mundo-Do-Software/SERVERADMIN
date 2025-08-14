from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os

from app.api.routes import system, users, services, network, packages, packages_essentials, auth, database, webserver, security
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Ubuntu Server Admin API starting...")
    yield
    # Shutdown
    print("👋 Ubuntu Server Admin API shutting down...")


app = FastAPI(
    title="Ubuntu Server Admin API",
    description="API para administração de servidor Ubuntu",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200", 
        "http://127.0.0.1:4200",
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:80"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(system.router, prefix="/api/v1/system", tags=["system"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(services.router, prefix="/api/v1/services", tags=["services"])
app.include_router(network.router, prefix="/api/v1/network", tags=["network"])
app.include_router(packages.router, prefix="/api/v1/packages", tags=["packages"])
app.include_router(packages_essentials.router, prefix="/api/v1/packages-essentials", tags=["packages-essentials"])
app.include_router(database.router, prefix="/api/v1/database", tags=["database"])
app.include_router(webserver.router, prefix="/api/v1/webserver", tags=["webserver"])
app.include_router(security.router, prefix="/api/v1/security", tags=["security"])


@app.get("/")
async def root():
    return {
        "message": "Ubuntu Server Admin API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# Convenience health endpoint under the API prefix as well
@app.get("/api/v1/health")
async def health_check_v1():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
