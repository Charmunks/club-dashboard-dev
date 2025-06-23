
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p static/uploads

# Use the PORT environment variable or default to 5000
EXPOSE ${PORT:-5000}

ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Use environment variable for port binding
CMD gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120 --log-level info --access-logfile - --error-logfile - main:app
