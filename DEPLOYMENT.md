# Backend Deployment Guide

This document describes the automated deployment workflow for the Marconi Elearn backend.

## Architecture

- **CI/CD Platform**: GitHub Actions
- **Container Registry**: Docker Hub
- **Deployment Target**: Docker Compose on your server
- **Database**: PostgreSQL 16 (Docker container)
- **Queue**: Redis (Docker container) - for background auto-grading
- **External Service**: JOBE (code execution, hosted separately)

## Prerequisites

### 1. Docker Hub Account

1. Create a Docker Hub account at https://hub.docker.com/
2. Create an access token at https://hub.docker.com/settings/security
   - Go to "Access Tokens" → "New Access Token"
   - Give it read/write permissions
   - Save the token - you'll need it for GitHub secrets

### 2. Server Setup

On your target server, install Docker and Docker Compose:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Add your user to docker group (optional, for running without sudo)
sudo usermod -aG docker $USER
```

### 3. SSH Access

Generate SSH keys on your GitHub Actions runner (or use existing keys):

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions"
```

Add the public key to your server:

```bash
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
```

### 4. GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

| Secret | Description | Example |
|--------|-------------|---------|
| `DOCKER_USERNAME` | Your Docker Hub username | `your-username` |
| `DOCKER_PASSWORD` | Docker Hub access token | `dckr_pat_...` |
| `SSH_PRIVATE_KEY` | Private SSH key for server access | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_HOST` | Server IP or hostname | `192.168.1.100` |
| `SSH_USER` | SSH username on server | `deploy` |
| `POSTGRES_USER` | PostgreSQL username | `marconi_user` |
| `POSTGRES_PASSWORD` | PostgreSQL password (strong random) | `xK9#mP2$vL5@nQ8` |
| `SUPERADMIN_EMAILS` | Comma-separated admin emails | `admin@school.edu` |
| `SUPERADMIN_PASSWORD` | Bootstrap password | `temp_password_change_me` |
| `CORS_ALLOW_ORIGINS` | Frontend URLs | `https://your-frontend.com` |
| `JOBE_BASE_URL` | JOBE service URL | `https://jobe.example.com/restapi` |

**Optional Secrets** (have sensible defaults):

| Secret | Default |
|--------|---------|
| `POSTGRES_DB` | `marconi` |
| `SESSION_COOKIE_NAME` | `marconi_session` |
| `SESSION_COOKIE_SECURE` | `true` |
| `SESSION_COOKIE_SAMESITE` | `lax` |
| `JOBE_TIMEOUT_SECONDS` | `20` |
| `JOBE_ALLOWED_LANGUAGES` | `c,cpp` |
| `REDIS_URL` | `redis://redis:6379/0` |
| `BACKEND_PORT` | `8000` |

## Deployment Workflow

When you push to the `main` branch, following happens automatically:

1. **Test**: Runs pytest on the backend
2. **Build**: Builds Docker image and pushes to Docker Hub
3. **Deploy**: SSH to server and:
   - Creates/updates `.env` file with secrets
   - Pulls latest Docker image
   - Restarts containers
   - Runs Alembic migrations

## Background Worker (Auto-grading)

The backend includes a Taskiq worker for background auto-grading of C/C++ submissions against test cases.

### Starting the Worker

On your server, start the worker in a separate terminal:

```bash
ssh deploy@your-server
cd ~/marconi
docker-compose exec -d backend python -m taskiq worker app.worker.broker:broker app.worker.tasks
```

Or run it on the host with docker-compose exec in the foreground:

```bash
docker-compose exec backend python -m taskiq worker app.worker.broker:broker app.worker.tasks
```

### Worker Requirements

- **REDIS_URL** must be configured for grading tasks to enqueue
- When `REDIS_URL` is empty, submissions are stored but not auto-graded
- Staff can manually regrade submissions via the API even without the worker

### Monitoring the Worker

```bash
ssh deploy@your-server
cd ~/marconi
docker-compose logs -f backend | grep taskiq
```

### Manual Trigger

You can also trigger deployment manually:
- Go to Actions tab → Deploy Backend → Run workflow

## Docker Image Tags

Images are tagged with:
- `latest` - Latest commit on main branch
- `main-{sha}` - Specific commit SHA
- `main` - Branch name

Example: `your-username/marconi-backend:main-a1b2c3d`

## Troubleshooting

### Container fails to start

Check logs:
```bash
ssh deploy@your-server
cd ~/marconi
docker-compose logs backend
docker-compose logs postgres
docker-compose logs redis
```

### Migrations failed

Run migrations manually:
```bash
ssh deploy@your-server
cd ~/marconi
docker-compose exec backend python -m alembic upgrade head
```

### Pull fails (authentication error)

Check that `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are correct.

### SSH connection fails

Check that:
- `SSH_PRIVATE_KEY` is properly formatted (includes newlines)
- `SSH_HOST` is reachable from GitHub Actions
- Public key is in `~/.ssh/authorized_keys` on server

## First Deployment

1. Verify all GitHub secrets are set
2. Push to `main` branch
3. Monitor the Actions tab for progress
4. Verify deployment: `curl https://your-backend.com/`

Should return: `{"status":"healthy"}`

## Database Backups

Manual backup:
```bash
ssh deploy@your-server
cd ~/marconi
docker-compose exec postgres pg_dump -U marconi_user marconi > backup_$(date +%Y%m%d).sql
```

Restore:
```bash
docker-compose exec -T postgres psql -U marconi_user marconi < backup_20240101.sql
```

## Monitoring

Check container status:
```bash
ssh deploy@your-server
cd ~/marconi
docker-compose ps
```

View logs in real-time:
```bash
docker-compose logs -f backend
```

## Security Notes

- Never commit `.env` files
- Rotate Docker Hub access tokens regularly
- Use strong passwords for PostgreSQL
- Keep SSH keys secure (add passphrase)
- Enable firewall rules to restrict access to ports
- Consider using managed database service for production
