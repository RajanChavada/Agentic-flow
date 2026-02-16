"""Application configuration – reads from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()

# CORS origin for the Next.js frontend
FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

# Uvicorn defaults
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
