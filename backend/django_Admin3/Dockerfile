# syntax=docker/dockerfile:1
# Django Backend Dockerfile — works for both Staging (Docker Compose) and UAT (Railway)
# Uses multi-stage build and avoids sensitive data in ARG/ENV

FROM python:3.14-slim AS builder

# Set working directory
WORKDIR /app

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.14-slim AS production

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libffi-dev \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash appuser

# Set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY --chown=appuser:appuser . .

# Create logs directory writable by appuser (staging settings writes logs here)
RUN mkdir -p /app/logs && chown appuser:appuser /app/logs

# Fix Windows CRLF line endings in shell scripts (git on Windows may check out with \r\n)
RUN find . -name "*.sh" -exec sed -i 's/\r$//' {} +

# Set non-sensitive environment variables only
# DJANGO_SETTINGS_MODULE is overridden at runtime by docker-compose or Railway env vars
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=django_Admin3.settings.staging \
    PORT=8888

# Collect static files with a dummy secret key (only needed at build time)
# Real secret key is provided at runtime
RUN DJANGO_SECRET_KEY=build-time-dummy-key-for-collectstatic \
    python manage.py collectstatic --noinput --clear

# Re-own logs dir after collectstatic (which may create django.log as root)
RUN chown -R appuser:appuser /app/logs

# Switch to non-root user
USER appuser

# Expose default port (overridden by $PORT at runtime)
EXPOSE ${PORT}

# Health check uses $PORT so it works for both staging (8888) and Railway (dynamic)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/api/health/')" || exit 1

# Start command - railway-start.sh uses $PORT for gunicorn bind
CMD ["bash", "railway-start.sh"]
