# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Expose port (Cloud Run uses PORT environment variable)
EXPOSE 8080

# Run the application
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
