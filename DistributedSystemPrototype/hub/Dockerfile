FROM python:3.11-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Expose port (will be overridden by docker-compose if needed)
EXPOSE 5001

# Run the app
CMD ["python", "app.py"]
