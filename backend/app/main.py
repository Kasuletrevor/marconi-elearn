from fastapi import FastAPI

from app.api.router import api_router

app = FastAPI(title="Marconi Elearn API")

app.include_router(api_router, prefix="/api/v1")

