# Render Deployment Guide

## Project Overview

The Hostel Leave Management System is a full-stack application with:
- **Backend API** (`apps/api`): Node.js/Express server with MongoDB
- **Frontend Web App** (`apps/web`): React application
- **Shared Packages** (`packages/`): TypeScript types and utilities

## Prerequisites

- A Render account (https://dashboard.render.com)
- GitHub repository with the project
- MongoDB Atlas or local MongoDB instance
- Environment variables configured

## Backend Deployment (API)

### 1. Prepare Docker Configuration

Create `Dockerfile` for API service:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY apps/api ./apps/api

RUN npm ci --only=production

EXPOSE 5000

CMD ["node", "apps/api/dist/server.js"]
```

### 2. Create render.yaml

Create `render.yaml` at root:

```yaml
services:
  - type: web
    name: hostel-leave-api
    env: node
    buildCommand: "npm run build:packages && npm run build:api"
    startCommand: "node apps/api/dist/server.js"
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: MONGODB_URI
        fromDatabase:
          name: hostel-leave-db
          property: connectionString
      - key: JWT_ACCESS_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: SMTP_USER
        fromSecret: smtp_user
      - key: SMTP_PASS
        fromSecret: smtp_pass
    healthCheck:
      path: /api/v1/health
      port: 5000
      timeout: 300
      interval: 30
    domains:
      - api.hostelleave.com
```

### 3. Configure Database

For MongoDB on Render:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "Add new Service" → "MongoDB"
3. Choose MongoDB version, cluster size, and region
4. Set up authentication and whitelist your API service
5. Note the connection string for environment variable

### 4. Connect Frontend to Backend

Set these environment variables in the web service config:

```yaml
- key: API_BASE_URL
  value: https://api.hostelleave.com
- key: WEB_BASE_URL
  value: https://web.hostelleave.com
```

### 5. Deploy

```bash
# Commit and push to GitHub
# On Render dashboard, connect your GitHub repository
# Select the render.yaml file and deploy
```

## Frontend Deployment (Web)

### 1. Prepare Docker Configuration

Create `Dockerfile` for web service:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* vite.config.ts* ./
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY apps/web ./apps/web

RUN npm ci --only=production

EXPOSE 3000

CMD ["npm", "run", "build", "&&", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
```

### 2. Update render.yaml for Web

```yaml
services:
  - type: web
    name: hostel-leave-web
    env: node
    buildCommand: "npm run build:packages && npm run build:web"
    startCommand: "vite preview --host 0.0.0.0 --port 3000"
    envVars:
      - key: NODE_ENV
        value: production
      - key: API_BASE_URL
        value: https://api.hostelleave.com
    healthCheck:
      path: /
      port: 3000
      timeout: 300
      interval: 30
    domains:
      - web.hostelleave.com
```

## Local Development Setup

### 1. Start Backend

```bash
# Install dependencies
npm install

# Build shared packages
npm run build:packages

# Start API in development mode
npm run dev:api
```

### 2. Start Frontend

```bash
# In another terminal
npm run dev:web
```

### 3. Environment Variables

Create `.env` file:

```env
NODE_ENV=development
PORT=5000
API_BASE_URL=http://localhost:5000
WEB_BASE_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/hostel_leave_mgmt

# JWT
JWT_ACCESS_SECRET=your_access_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (SMTP - using Ethereal for development)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@ethereal.email
SMTP_PASS=your_password
EMAIL_FROM_NAME=Hostel Leave Management
EMAIL_FROM_ADDRESS=noreply@hostelleave.edu

# QR Code
QR_SECRET=your_qr_encryption_secret_min_32_chars
QR_EXPIRY_HOURS=72

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/jpg,application/pdf

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=1000

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8081

# Logging
LOG_LEVEL=debug
LOG_DIR=./logs

# Admin Seed
ADMIN_EMAIL=admin@hostelleave.edu
ADMIN_PASSWORD=Admin@123456
ADMIN_NAME=System Administrator

# Cloudinary Configuration (optional)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_FOLDER=hostel_leave_documents
```

## Production Deployment

### 1. Database Setup

For production, ensure:
- MongoDB Atlas or cloud MongoDB instance
- Backups scheduled regularly
- Security group/IP whitelist

### 2. SSL/TLS

Render automatically provides SSL certificates.

### 3. Build Optimization

- Ensure `npm ci` is used in Docker for reproducible builds
- Consider using build caching
- Monitor build times and optimize if needed

### 4. Environment Variables Management

Create `env.example` for documentation:

```env
# Required environment variables
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# Optional configuration
API_BASE_URL=https://api.hostelleave.com
WEB_BASE_URL=https://web.hostelleave.com
```

## Monitoring & Maintenance

### 1. Health Checks

Render provides built-in health checks. Configure:

```yaml
healthCheck:
  path: /api/v1/health
  port: 5000
  timeout: 300
  interval: 30
```

### 2. Log Monitoring

Render logs can be viewed in dashboard. Configure log levels:
- `debug`: Detailed logs (useful for development)
- `info`: Normal operation logs
- `warn`: Warning messages only
- `error`: Only error messages

### 3. Backup

- MongoDB Atlas has automated backups
- Export important data periodically
- Monitor database performance

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clean and rebuild
   npm run clean
   npm run build:all
   ```

2. **Database Connection Issues**
   - Check MongoDB Atlas network settings
   - Verify connection string
   - Ensure IP whitelisting

3. **Port Conflicts**
   - Ensure Render services use different ports
   - Check environment variable configuration

4. **SSL Certificate Issues**
   - Let Render handle SSL automatically
   - Ensure CNAME records are correct

### Deployment Steps Checklist

- [ ] Commit all code to GitHub
- [ ] Configure Render dashboard
- [ ] Set up MongoDB database
- [ ] Configure environment variables
- [ ] Test health endpoints
- [ ] Configure SSL certificates
- [ ] Set up monitoring
- [ ] Update DNS records if needed

## Rollback

If issues occur:

1. Go to Render dashboard → Services → Select service
2. Click "Previous Deploy" or "Rollback"
3. Monitor logs for any issues
4. Test critical functionality

## FAQ

**Q: Can I use a custom domain?**
A: Yes, add custom domains in Render dashboard settings.

**Q: How do I update the code?**
A: Push to GitHub and redeploy from Render dashboard.

**Q: What about CI/CD?**
A: Render integrates with GitHub Actions for automated deployments.

**Q: How do I scale the services?**
A: Choose different instance types in Render dashboard.

## Links

- [Render Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/node)
- [MongoDB on Render](https://render.com/docs/mongodb)
- [GitHub Actions Integration](https://render.com/docs/deploy-with-github-actions)