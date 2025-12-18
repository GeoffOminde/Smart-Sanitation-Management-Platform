# Deployment Documentation

## Docker Deployment

This guide covers deploying the application using Docker.

### Prerequisites

- Docker Installed
- Docker Compose Installed

### Using Docker Compose (Recommended)

To run the entire stack (Frontend + Backend + Database):

```bash
docker-compose up -d --build
```

**View Logs:**
```bash
docker-compose logs -f
```

**Stop Services:**
```bash
docker-compose down
```

### Individual Docker Commands

#### Build Backend
```bash
docker build -f Dockerfile -t smart-sanitation-backend .
```

#### Build Frontend
```bash
docker build -f frontend.Dockerfile -t smart-sanitation-frontend .
```

#### Run Backend (Secure Environment Variables)

**WARNING:** Never use --env-file with files containing secrets on a production server. Pass secrets securely via your orchestration tool or environment variables.

```bash
# Example with inline environment variables (for testing/demo only)
docker run -d -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your_production_secret" \
  smart-sanitation-backend
```

#### Run Frontend
```bash
docker run -d -p 5173:5173 smart-sanitation-frontend
```

## Cloud Deployment

See [DEPLOY.md](./DEPLOY.md) for detailed cloud deployment guides (Vercel, Railway, Render).
