"""Application configuration – reads from environment variables."""

import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# CORS origins for the Next.js frontend.
# Supports multiple origins separated by commas for local + production.
# Example: "http://localhost:3000,https://neurovn.vercel.app"
_raw_origins = os.getenv("FRONTEND_ORIGINS", os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"))
FRONTEND_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# Uvicorn defaults
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))

# LLM configuration for NL-to-schema generation
OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
SCHEMA_GEN_MODEL: str = os.getenv("SCHEMA_GEN_MODEL", "gpt-4o-mini")
