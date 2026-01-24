# Backend Deployment Guide

This document describes the automated deployment workflow for the Marconi Elearn backend.

## Architecture

- **CI/CD Platform**: GitHub Actions
- **Container Registry**: Docker Hub
- **Deployment Target**: Docker Compose on your server
- **Database**: PostgreSQL 16 (Docker container) - external port `16098`
- **Queue**: Redis (Docker container) - external port `40971`
- **API**: Backend - external port `32316` (randomized for security)
- **Code Execution**: JOBE (recommended: run as a Docker service on the same internal network; do not expose publicly)

**Note**: All services communicate on the internal Docker network (`marconi-network`) using standard ports (PostgreSQL 5432, Redis 6379, Backend 8000). Random ports are only for external access to reduce exposure. Nginx proxy can route traffic to any internal port.

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
| `JOBE_BASE_URL` | JOBE service URL | `http://jobe/jobe/index.php/restapi` |

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
| `BACKEND_PORT` | `32316` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` |

**External Ports** (randomized for security):

| Service | External Port | Internal Port |
|---------|----------------|---------------|
| Backend | `32316` | `8000` |
| PostgreSQL | `16098` | `5432` |
| Redis | `40971` | `6379` |

These can be changed in `docker-compose.yml`. Nginx on the same network can route traffic to internal ports regardless of external ports.

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

The backend includes background services for auto-grading C/C++ submissions against test cases:

- **Taskiq worker**: executes queued grading jobs
- **Deadline poller**: periodically checks assignment due dates and enqueues *final* autograding at the deadline

### Starting the Worker

On your server, start the worker + deadline poller via Docker Compose:

```bash
ssh deploy@your-server
cd ~/marconi
docker-compose up -d worker deadline-poller
```

To tail logs:

```bash
docker-compose logs -f worker
docker-compose logs -f deadline-poller
```

### Worker Requirements

- **REDIS_URL** must be configured for grading tasks to enqueue
- When `REDIS_URL` is empty, submissions are stored but not auto-graded
- Staff can manually regrade submissions via the API even without the worker

### Deadline Poller Notes

- Final autograding runs automatically at `assignment.due_date` (deadline poller enqueues the job; the worker executes it).
- After an assignment has a final autograde, the autograding configuration is locked to preserve grading integrity.

### Manual Trigger

You can also trigger deployment manually:
- Go to Actions tab → Deploy Backend → Run workflow

## GitHub Classroom (Admin Integrations)

Org admins can connect a GitHub account (GitHub App web flow) at `Admin → Settings → Integrations`.

Server configuration (stored in `.env` on the server):

- `TOKEN_ENCRYPTION_KEY` (Fernet key) – required to store GitHub tokens securely.
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_OAUTH_REDIRECT_URL` (must match the callback URL configured in the GitHub App; points to `/api/v1/integrations/github/callback`).

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

## Nginx Proxy Manager Integration

The backend connects to two external Docker networks for reverse proxy access:

- `nginx-proxy-manager_npm-network` - Nginx Proxy Manager network
- `proxy_hostinger-network` - Hostinger proxy network

These networks are automatically created during deployment if they don't exist.

### Nginx Proxy Manager Configuration

1. **Access NPM Dashboard**
   - Go to `http://your-server:81` (or your NPM port)
   - Login with admin credentials

2. **Create Proxy Host**

   Click "Hosts" → "Proxy Hosts" → "Create Proxy Host":

   | Field | Value |
   |-------|-------|
   | **Domain Names** | `api.yourdomain.com` |
   | **Scheme** | `http` |
   | **Forward Hostname / IP** | `marconi-backend` |
   | **Forward Port** | `8000` |
   | **Block Common Exploits** | ☑ Enabled |

3. **SSL Configuration**

   In the same form, click "SSL" tab:
   - Select "Request a new SSL Certificate"
   - Enable "Force SSL"
   - Enable "HTTP/2"
   - Click "Save"

4. **Advanced Options** (optional)

   Click "Advanced" tab for custom Nginx config:

   ```nginx
   # Enable WebSocket support for future features
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";

   # Proper headers
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;

   # Timeouts for long-running operations
   proxy_connect_timeout 60s;
   proxy_send_timeout 60s;
   proxy_read_timeout 60s;
   ```

5. **CORS Headers** (if needed)

   Add to advanced config if experiencing CORS issues:

   ```nginx
   add_header Access-Control-Allow-Origin $http_origin always;
   add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
   add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept" always;
   add_header Access-Control-Allow-Credentials "true" always;

   if ($request_method = 'OPTIONS') {
       add_header Access-Control-Allow-Origin $http_origin;
       add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
       add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept";
       add_header Access-Control-Allow-Credentials "true";
       add_header Content-Length 0;
       add_header Content-Type text/plain;
       return 204;
   }
   ```

6. **Test Configuration**

   After creating the proxy host:
   ```bash
   curl -I https://api.yourdomain.com/
   ```

   Should return `200 OK` with proper headers.

### Hostinger Proxy Configuration

For the `proxy_hostinger-network`, configure similarly in your Hostinger dashboard:

1. Add domain `api.yourdomain.com`
2. Set proxy target to container name: `marconi-backend`
3. Set port to: `8000` (internal Docker port)
4. Enable SSL certificate

### Network Connectivity Verification

Verify containers are connected to external networks:

```bash
ssh deploy@your-server
cd ~/marconi
docker network inspect nginx-proxy-manager_npm-network --format '{{range .Containers}}{{.Name}} {{end}}'
# Should list: marconi-backend marconi-postgres marconi-redis
```

If containers are not connected, restart them:

```bash
docker-compose down
docker-compose up -d
```

## Security Notes

- **Random Ports**: External ports are randomized (Backend: 32316, PostgreSQL: 16098, Redis: 40971) to reduce automated scanning
- **Internal Communication**: Services use standard ports on Docker network, Nginx proxy routes to internal ports
- Never commit `.env` files
- Rotate Docker Hub access tokens regularly
- Use strong passwords for PostgreSQL
- Keep SSH keys secure (add passphrase)
- Enable firewall rules to restrict access to random ports only
- Consider using managed database service for production
- Backend container runs as non-root user (`appuser`)
