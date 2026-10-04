# ==============================================================================
# SIH-121 / NWIS Multi-Stage Production Dockerfile
# Builds frontend assets and serves them via FastAPI backend
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Production Python Runtime
FROM python:3.11-slim AS production
WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy application source & data
COPY backend/ ./backend/
COPY data/ ./data/
COPY --from=frontend-builder /app/web/dist ./dist

# Environment configuration
ENV PORT=8000
ENV HOST=0.0.0.0
ENV ENVIRONMENT=production

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start FastAPI server
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
