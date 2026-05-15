# ---------- Base Image ----------
FROM python:3.12-slim

# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1

# Prevent Python buffering logs
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# ---------- Install dependencies first (better caching) ----------
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# ---------- Copy source code ----------
COPY . .

# ---------- Expose port ----------
EXPOSE 8000

# ---------- Run FastAPI ----------
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]