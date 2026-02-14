# CodePop Deployment Plan

**Version:** 1.0
**Last Updated:** February 13, 2026
**Platform:** Google Cloud Platform (GCP)

---

## Table of Contents

1. [Platform Selection](#1-platform-selection)
2. [Architecture Overview](#2-architecture-overview)
3. [Component Deployment Details](#3-component-deployment-details)
4. [Cost Analysis](#4-cost-analysis)
5. [Initial Setup](#5-initial-setup)
6. [Single Store Deployment](#6-single-store-deployment)
7. [Multi-Store Deployment](#7-multi-store-deployment)
8. [Mobile App Deployment](#8-mobile-app-deployment)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [Monitoring and Logging](#10-monitoring-and-logging)
11. [Security Implementation](#11-security-implementation)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Troubleshooting](#13-troubleshooting)
14. [References](#14-references)

---

## 1. Platform Selection

### Chosen Platform: Google Cloud Platform (GCP)

**Rationale:**
- **Cost-Effective:** 25% cheaper than Azure for equivalent resources (~$7,400-10,000/month vs $9,800-12,400/month for 30 stores + 7 hubs)
- **Student Benefits:** $300 in free credits (90 days) vs Azure's $100/year
- **Django Support:** Excellent documentation and community resources for Django deployment
- **Container-Native:** Cloud Run provides superior container orchestration for our multi-instance architecture
- **Simplified Management:** Easier to deploy and manage 30+ independent service instances

### Comparison: GCP vs Azure

| Feature | GCP | Azure |
|---------|-----|-------|
| **Django Hosting** | Cloud Run (serverless containers) | App Service (PaaS) |
| **PostgreSQL Cost** | ~$116/month per instance | ~$141/month per instance |
| **Redis Management** | Memorystore (mature, Redis 7.0+) | Azure Managed Redis (newly GA, Redis 7.4+) |
| **Student Credits** | $300 (one-time, 90 days) | $100/year (renewable) |
| **Free Tier** | 2M requests/month free | Less generous |
| **Deployment Complexity** | Simpler (container-focused) | More configuration required |
| **Total Cost (30 stores)** | $7,400-10,000/month | $9,800-12,400/month |

---

## 2. Architecture Overview

### Cloud Infrastructure Topology

```
┌─────────────────────────────────────────────────────────────┐
│                   Google Cloud Platform                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────-┐   │
│  │         Regional Supply Hub (Logan, UT)              │   │
│  │  - Cloud Run Service (Django hub config)             │   │
│  │  - Cloud SQL PostgreSQL (service registry)           │   │
│  │  - Memorystore Redis (logistics coordination)        │   │
│  └──────────────┬──────────────────────┬────────────────┘   │
│                 │                      │                    │
│    ┌────────────▼────────┐   ┌────────▼────────┐            │
│    │  Store Node A       │   │  Store Node B   │            │
│    │  (Logan-001)        │   │  (Logan-002)    │            │
│    │                     │   │                 │            │
│    │  Cloud Run:         │   │  Cloud Run:     │            │
│    │  - Django API       │   │  - Django API   │            │
│    │  - Celery Workers   │   │  - Celery Workers│           │
│    │                     │   │                 │            │
│    │  Cloud SQL:         │   │  Cloud SQL:     │            │
│    │  - PostgreSQL 15    │   │  - PostgreSQL 15│            │
│    │                     │   │                 │            │
│    │  Memorystore:       │   │  Memorystore:   │            │
│    │  - Redis 7.0+       │   │  - Redis 7.0+   │            │
│    └──────────┬──────────┘   └────────┬────────┘            │
│               │                       │                     │
└───────────────┼───────────────────────┼────────────────────-┘
                │                       │
         ┌──────▼───────┐       ┌──────▼───────┐
         │ Mobile Client│       │ Mobile Client│
         │ (React Native)       │ (React Native)│
         │ via EAS      │       │ via EAS      │
         └──────────────┘       └──────────────┘
```

### Per-Store Infrastructure Components

Each store and hub deployment consists of:

1. **Cloud Run Service**
   - Django REST API application
   - Celery worker processes (background tasks)
   - Auto-scaling based on request volume
   - HTTPS endpoint with custom domain

2. **Cloud SQL Instance**
   - PostgreSQL 15 database
   - Automated backups (daily full, hourly incremental)
   - Point-in-time recovery (30-day retention)
   - High availability option (for critical hubs)

3. **Memorystore Redis**
   - Message broker for Celery task queue
   - Session storage (optional)
   - Caching layer

4. **Cloud Storage Bucket**
   - Static files (CSS, JS, images)
   - User uploads
   - Database backup archives

5. **Secret Manager**
   - Database credentials
   - API keys (Stripe, Mapbox, Firebase)
   - Inter-node authentication secrets

---

## 3. Component Deployment Details

### 3.1 Django Backend (Cloud Run)

**Why Cloud Run?**
- Serverless: No server management required
- Auto-scaling: Scales up/down based on traffic automatically
- Cost-efficient: Scale to zero during low traffic (pay only for requests)
- Container-based: Consistent environments across dev/staging/production

**Configuration:**
- **Runtime:** Python 3.11 (latest stable)
- **Web Server:** Gunicorn (production WSGI server)
- **Concurrency:** 1 worker with 8 threads per instance (Gunicorn config)
- **Memory:** 512 MB - 2 GB per instance
- **CPU:** 1-2 vCPU per instance
- **Max Instances:** 10 per store (can adjust based on traffic)
- **Request Timeout:** 300 seconds (5 minutes for long operations)

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run migrations (optional - can be done separately)
# RUN python manage.py migrate --noinput

# Expose port (Cloud Run sets PORT env variable)
ENV PORT 8080

# Run Gunicorn
CMD exec gunicorn \
    --bind :$PORT \
    --workers 1 \
    --threads 8 \
    --timeout 300 \
    --access-logfile - \
    --error-logfile - \
    codepop.wsgi:application
```

**Required Python Packages (additions to requirements.txt):**
```
# Production WSGI server
gunicorn==21.2.0

# GCP integrations
google-cloud-secret-manager==2.16.0
google-cloud-storage==2.10.0
google-cloud-sql-connector==1.2.0

# PostgreSQL driver (binary version for easier install)
psycopg2-binary==2.9.9

# Django storage backend for GCS
django-storages[google]==1.14.2
```

### 3.2 PostgreSQL (Cloud SQL)

**Instance Specifications:**

**Development/Testing:**
- Machine Type: db-f1-micro (1 vCPU, 614 MB RAM)
- Storage: 10 GB SSD
- Cost: ~$10-15/month

**Production (Per Store):**
- Machine Type: db-n1-standard-1 (1 vCPU, 3.75 GB RAM)
- Storage: 50 GB SSD with automatic storage increase
- Backups: Automated daily + transaction logs
- High Availability: Optional (adds ~70% to cost)
- Cost: ~$116/month

**Django Settings Configuration:**
```python
# settings.py
import os
from google.cloud.sql.connector import Connector

# Cloud SQL connection using unix socket
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['DB_NAME'],
        'USER': os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': f'/cloudsql/{os.environ["CLOUD_SQL_CONNECTION_NAME"]}',
        'PORT': '5432',
        'CONN_MAX_AGE': 60,  # Connection pooling (60 seconds)
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'  # 30 second query timeout
        }
    }
}
```

**Creating a Cloud SQL Instance:**
```bash
# Create PostgreSQL instance
gcloud sql instances create store-logan-001-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=03:00 \
  --enable-bin-log

# Create database
gcloud sql databases create codepop_logan_001 \
  --instance=store-logan-001-db

# Create user
gcloud sql users create codepop_user \
  --instance=store-logan-001-db \
  --password=SECURE_PASSWORD_HERE
```

### 3.3 Redis (Memorystore)

**Instance Specifications:**

**Development/Testing:**
- Tier: Basic (no high availability)
- Memory: 1 GB
- Cost: ~$30/month

**Production (Per Store):**
- Tier: Standard (high availability with automatic failover)
- Memory: 2 GB
- Cost: ~$50/month

**Django + Celery Configuration:**
```python
# settings.py
import os

# Redis connection (from environment variables)
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = os.environ.get('REDIS_PORT', '6379')
REDIS_URL = f'redis://{REDIS_HOST}:{REDIS_PORT}/0'

# Celery configuration
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes max
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
```

**Creating a Memorystore Instance:**
```bash
# Create Redis instance
gcloud redis instances create store-logan-001-redis \
  --size=1 \
  --region=us-central1 \
  --tier=basic \
  --redis-version=redis_7_0

# Get connection info
gcloud redis instances describe store-logan-001-redis \
  --region=us-central1 \
  --format="get(host,port)"
```

### 3.4 Static Files (Cloud Storage)

**Configuration:**
```python
# settings.py
from google.oauth2 import service_account

# Static files configuration
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files configuration (user uploads)
DEFAULT_FILE_STORAGE = 'storages.backends.gcs.GoogleCloudStorage'
GS_BUCKET_NAME = os.environ['GS_BUCKET_NAME']
GS_PROJECT_ID = os.environ['GCP_PROJECT_ID']
GS_DEFAULT_ACL = 'publicRead'
GS_FILE_OVERWRITE = False
GS_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # 5MB

# Optional: Use Cloud Storage for static files too
# STATICFILES_STORAGE = 'storages.backends.gcs.GoogleCloudStorage'
```

**Creating a Storage Bucket:**
```bash
# Create bucket for store
gsutil mb -l us-central1 gs://codepop-store-logan-001

# Set public read access for static files
gsutil iam ch allUsers:objectViewer gs://codepop-store-logan-001

# Enable versioning (for backups)
gsutil versioning set on gs://codepop-store-logan-001
```

### 3.5 Secrets (Secret Manager)

**Storing Secrets:**
```bash
# Store database password
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password \
  --data-file=-

# Store Stripe API key
echo -n "sk_live_XXXXXXXX" | gcloud secrets create stripe-secret-key \
  --data-file=-

# Store inter-node authentication secret
echo -n "RANDOM_SECURE_KEY" | gcloud secrets create inter-node-secret \
  --data-file=-

# Grant Cloud Run service access to secrets
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Accessing Secrets in Django:**
```python
# settings.py
from google.cloud import secretmanager

def get_secret(secret_id, project_id):
    """Retrieve secret from Secret Manager"""
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode('UTF-8')

# Get secrets
GCP_PROJECT_ID = os.environ.get('GCP_PROJECT_ID')
DATABASES['default']['PASSWORD'] = get_secret('db-password', GCP_PROJECT_ID)
STRIPE_SECRET_KEY = get_secret('stripe-secret-key', GCP_PROJECT_ID)
INTER_NODE_SECRET = get_secret('inter-node-secret', GCP_PROJECT_ID)
```

---

## 4. Cost Analysis

### 4.1 Per-Store Monthly Costs (Production)

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| Cloud Run | ~100K requests/day, 512MB RAM | $50-100 |
| Cloud SQL PostgreSQL | db-n1-standard-1, 50GB SSD | $116 |
| Memorystore Redis | Standard tier, 2GB | $50 |
| Cloud Storage | 10GB storage, 100GB egress | $10 |
| Secret Manager | ~10 secrets, 1000 accesses | $1 |
| Cloud Logging | 10GB logs/month | $5 |
| **Total per Store** | | **~$232-282** |

### 4.2 Total Infrastructure Costs

**Scenario: 30 Stores + 7 Regional Hubs**

| Deployment Size | Monthly Cost | Annual Cost |
|-----------------|--------------|-------------|
| 1 Store (MVP) | $232-282 | $2,784-3,384 |
| 5 Stores + 1 Hub | $1,392-1,692 | $16,704-20,304 |
| 10 Stores + 3 Hubs | $3,016-3,666 | $36,192-43,992 |
| 30 Stores + 7 Hubs | $8,584-10,434 | $103,008-125,208 |

### 4.3 Cost Optimization Strategies

**For School Project Phase (0-6 months):**

1. **Use Free Tier Heavily**
   - GCP $300 credits cover ~3-4 months of development
   - Cloud Run: 2M requests/month free (covers 2-3 low-traffic stores)
   - Cloud Storage: 5GB storage free
   - Secret Manager: 6 secrets free

2. **Start Small**
   - Deploy only 3-5 stores initially
   - Use db-f1-micro tier for PostgreSQL ($10-15/month)
   - Basic Redis tier ($30/month)
   - Estimated cost with free tier: **$0-100/month for first 3 months**

3. **Shared Resources**
   - Multiple stores can share one Redis instance (namespace by store_id)
   - Use one Cloud SQL instance with multiple databases initially
   - Reduces cost to ~$150-200/month for 5 stores

4. **Development Environment**
   - Use SQLite locally (no cloud database needed)
   - Docker Compose for local Redis
   - Only deploy to cloud for integration testing

**For Production Phase (Post-Launch):**

1. **Committed Use Discounts**
   - 1-year commitment: 37% discount
   - 3-year commitment: 57% discount
   - Savings: ~$3,000-5,000/month for full deployment

2. **Right-Sizing**
   - Monitor actual usage with Cloud Monitoring
   - Downgrade over-provisioned instances
   - Use auto-scaling to handle traffic spikes

3. **Regional Pricing**
   - us-central1 (Iowa): Cheapest US region
   - us-east1 (South Carolina): Second cheapest
   - Savings: ~10-15% vs coastal regions

4. **Reserved Capacity**
   - Reserve Cloud SQL capacity for known baseline
   - Pay-as-you-go for burst traffic

### 4.4 Cost Comparison by Phase

| Phase | Duration | Deployment | GCP Cost | Azure Cost | Savings |
|-------|----------|------------|----------|------------|---------|
| **MVP** | 3 months | 1 store | $0 (free tier) | $0 (free tier) | N/A |
| **Alpha Testing** | 3 months | 5 stores + 1 hub | $150-300/month | $250-400/month | 40% |
| **Beta Testing** | 6 months | 10 stores + 3 hubs | $2,000-2,500/month | $2,600-3,200/month | 30% |
| **Production** | Ongoing | 30 stores + 7 hubs | $8,500-10,500/month | $10,000-12,500/month | 25% |

---

## 5. Initial Setup

### 5.1 Create GCP Account

1. **Sign up for GCP:**
   - Go to https://cloud.google.com
   - Click "Get started for free"
   - Use your student email (@usu.edu)
   - Provides $300 free credits (90 days)
   - No credit card required initially

2. **Create a Project:**
   ```bash
   # Install gcloud CLI
   # macOS: brew install google-cloud-sdk
   # Linux: curl https://sdk.cloud.google.com | bash

   # Initialize gcloud
   gcloud init

   # Create project
   gcloud projects create codepop-production --name="CodePop"

   # Set as default project
   gcloud config set project codepop-production
   ```

3. **Enable Required APIs:**
   ```bash
   # Enable all required services
   gcloud services enable \
     run.googleapis.com \
     sql-component.googleapis.com \
     sqladmin.googleapis.com \
     redis.googleapis.com \
     storage.googleapis.com \
     secretmanager.googleapis.com \
     cloudbuild.googleapis.com \
     containerregistry.googleapis.com
   ```

4. **Set Up Billing:**
   - Link credit card (for post-trial period)
   - Set up billing alerts (recommend: $100, $500, $1000)
   - Enable billing export to BigQuery (for cost analysis)

### 5.2 Configure Development Environment

**Install Required Tools:**
```bash
# Install gcloud CLI (if not done above)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Install Docker (for local testing and builds)
# macOS: brew install --cask docker
# Linux: curl -fsSL https://get.docker.com | sh

# Authenticate with GCP
gcloud auth login
gcloud auth configure-docker

# Set default region (choose closest to you)
gcloud config set run/region us-central1
gcloud config set compute/region us-central1
```

**Configure Service Account:**
```bash
# Create service account for deployments
gcloud iam service-accounts create codepop-deployer \
  --display-name="CodePop Deployment Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding codepop-production \
  --member="serviceAccount:codepop-deployer@codepop-production.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding codepop-production \
  --member="serviceAccount:codepop-deployer@codepop-production.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding codepop-production \
  --member="serviceAccount:codepop-deployer@codepop-production.iam.gserviceaccount.com" \
  --role="roles/redis.admin"

# Download key for CI/CD (save this securely!)
gcloud iam service-accounts keys create ~/codepop-deployer-key.json \
  --iam-account=codepop-deployer@codepop-production.iam.gserviceaccount.com
```

### 5.3 Prepare Django Application

**Update settings.py for Cloud Deployment:**
```python
# settings.py
import os
from google.cloud import secretmanager

# Detect if running on Cloud Run
IS_CLOUD_RUN = os.getenv('K_SERVICE') is not None

# SECURITY WARNING: keep the secret key secret!
if IS_CLOUD_RUN:
    SECRET_KEY = get_secret('django-secret-key', os.getenv('GCP_PROJECT_ID'))
else:
    SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-key-change-in-production')

# Debug mode (never True in production)
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# Allowed hosts
if IS_CLOUD_RUN:
    ALLOWED_HOSTS = [
        '.run.app',  # Default Cloud Run domain
        '.codepop.com',  # Custom domain
        os.getenv('STORE_DOMAIN', '')
    ]
else:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Database configuration (see section 3.2)
# ... (already covered above)

# Static files (see section 3.4)
# ... (already covered above)

# Store-specific configuration
STORE_ID = os.getenv('STORE_ID', 'DEV-001')
REGION_CODE = os.getenv('REGION_CODE', 'LOCAL')
IS_HUB = os.getenv('IS_HUB', 'False') == 'True'

# Inter-node communication
PEER_REGISTRY_URL = os.getenv('PEER_REGISTRY_URL', 'http://localhost:8001')
INTER_NODE_SECRET = get_secret('inter-node-secret', os.getenv('GCP_PROJECT_ID')) if IS_CLOUD_RUN else 'dev-secret'
```

**Create Environment Variables File:**
```bash
# .env.example (commit this to repo)
DEBUG=False
DJANGO_SECRET_KEY=your-secret-key-here
DB_NAME=codepop_production
DB_USER=codepop_user
DB_PASSWORD=your-db-password
CLOUD_SQL_CONNECTION_NAME=project:region:instance
GS_BUCKET_NAME=codepop-static-files
GCP_PROJECT_ID=codepop-production
STORE_ID=LOGAN-001
REGION_CODE=C
IS_HUB=False
PEER_REGISTRY_URL=https://hub-logan.codepop.com

# External APIs
STRIPE_SECRET_KEY=sk_test_xxxxx
MAPBOX_ACCESS_TOKEN=pk.xxxxx
FIREBASE_SERVER_KEY=xxxxx
```

---

## 6. Single Store Deployment

### 6.1 Deploy First Store (Manual Process)

This section walks through deploying your first store manually to understand each step.

**Step 1: Create Cloud SQL Instance**
```bash
# Create PostgreSQL instance for Logan-001 store
gcloud sql instances create store-logan-001-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04

# Create database
gcloud sql databases create codepop_logan_001 \
  --instance=store-logan-001-db

# Create user with strong password
gcloud sql users create codepop_user \
  --instance=store-logan-001-db \
  --password="$(openssl rand -base64 32)"

# Get connection name (needed for Cloud Run)
gcloud sql instances describe store-logan-001-db \
  --format="value(connectionName)"
# Output: codepop-production:us-central1:store-logan-001-db
```

**Step 2: Create Redis Instance**
```bash
# Create Redis instance for Logan-001 store
gcloud redis instances create store-logan-001-redis \
  --size=1 \
  --region=us-central1 \
  --tier=basic \
  --redis-version=redis_7_0

# Get host and port
gcloud redis instances describe store-logan-001-redis \
  --region=us-central1 \
  --format="value(host,port)"
# Output: 10.0.0.3 6379
```

**Step 3: Create Storage Bucket**
```bash
# Create bucket for static files
gsutil mb -l us-central1 gs://codepop-store-logan-001

# Set CORS policy (for web access)
cat > cors.json <<EOF
[
  {
    "origin": ["https://store-logan-001.codepop.com", "http://localhost:8000"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://codepop-store-logan-001
```

**Step 4: Store Secrets**
```bash
# Generate and store Django secret key
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" | \
  gcloud secrets create django-secret-key-logan-001 --data-file=-

# Store database password
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password-logan-001 --data-file=-

# Store inter-node secret (same for all stores)
echo -n "$(openssl rand -base64 32)" | gcloud secrets create inter-node-secret --data-file=-

# Store external API keys
echo -n "sk_test_XXXXXX" | gcloud secrets create stripe-secret-key --data-file=-
echo -n "pk.XXXXXX" | gcloud secrets create mapbox-token --data-file=-
```

**Step 5: Build Docker Image**
```bash
# Navigate to Django project root
cd /path/to/codepop/backend

# Build and submit to Container Registry
gcloud builds submit --tag gcr.io/codepop-production/store-logan-001:v1.0.0

# Tag as latest
gcloud container images add-tag \
  gcr.io/codepop-production/store-logan-001:v1.0.0 \
  gcr.io/codepop-production/store-logan-001:latest
```

**Step 6: Deploy to Cloud Run**
```bash
# Deploy Cloud Run service
gcloud run deploy store-logan-001 \
  --image=gcr.io/codepop-production/store-logan-001:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=10 \
  --min-instances=0 \
  --concurrency=80 \
  --add-cloudsql-instances=codepop-production:us-central1:store-logan-001-db \
  --set-env-vars="^##^STORE_ID=LOGAN-001##REGION_CODE=C##IS_HUB=False##REDIS_HOST=10.0.0.3##REDIS_PORT=6379##CLOUD_SQL_CONNECTION_NAME=codepop-production:us-central1:store-logan-001-db##DB_NAME=codepop_logan_001##DB_USER=codepop_user##GS_BUCKET_NAME=codepop-store-logan-001##GCP_PROJECT_ID=codepop-production" \
  --set-secrets="DB_PASSWORD=db-password-logan-001:latest,SECRET_KEY=django-secret-key-logan-001:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,MAPBOX_TOKEN=mapbox-token:latest,INTER_NODE_SECRET=inter-node-secret:latest"

# Get service URL
gcloud run services describe store-logan-001 \
  --region=us-central1 \
  --format="value(status.url)"
# Output: https://store-logan-001-xxxxx.run.app
```

**Step 7: Run Database Migrations**
```bash
# Run migrations using Cloud Run Jobs (one-time task)
gcloud run jobs create store-logan-001-migrate \
  --image=gcr.io/codepop-production/store-logan-001:latest \
  --region=us-central1 \
  --add-cloudsql-instances=codepop-production:us-central1:store-logan-001-db \
  --set-env-vars="STORE_ID=LOGAN-001,REGION_CODE=C,CLOUD_SQL_CONNECTION_NAME=codepop-production:us-central1:store-logan-001-db,DB_NAME=codepop_logan_001,DB_USER=codepop_user,GCP_PROJECT_ID=codepop-production" \
  --set-secrets="DB_PASSWORD=db-password-logan-001:latest,SECRET_KEY=django-secret-key-logan-001:latest" \
  --command="python" \
  --args="manage.py,migrate,--noinput"

# Execute migration job
gcloud run jobs execute store-logan-001-migrate --region=us-central1

# Create superuser (manually via Cloud Shell)
gcloud run services proxy store-logan-001 --region=us-central1
# Then in another terminal:
# python manage.py createsuperuser
```

**Step 8: Deploy Celery Workers**
```bash
# Deploy Celery worker as separate Cloud Run service
gcloud run deploy store-logan-001-worker \
  --image=gcr.io/codepop-production/store-logan-001:latest \
  --platform=managed \
  --region=us-central1 \
  --no-allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --max-instances=5 \
  --min-instances=1 \
  --command="celery" \
  --args="-A,codepop,worker,-l,info" \
  --add-cloudsql-instances=codepop-production:us-central1:store-logan-001-db \
  --set-env-vars="STORE_ID=LOGAN-001,REGION_CODE=C,REDIS_HOST=10.0.0.3,REDIS_PORT=6379,CLOUD_SQL_CONNECTION_NAME=codepop-production:us-central1:store-logan-001-db,DB_NAME=codepop_logan_001,DB_USER=codepop_user,GCP_PROJECT_ID=codepop-production" \
  --set-secrets="DB_PASSWORD=db-password-logan-001:latest,SECRET_KEY=django-secret-key-logan-001:latest,INTER_NODE_SECRET=inter-node-secret:latest"
```

**Step 9: Verify Deployment**
```bash
# Test API endpoint
SERVICE_URL=$(gcloud run services describe store-logan-001 \
  --region=us-central1 --format="value(status.url)")

curl "$SERVICE_URL/api/health/"
# Expected: {"status": "ok", "store_id": "LOGAN-001", "region": "C"}

# Check logs
gcloud run logs read store-logan-001 --region=us-central1 --limit=50

# Check Celery worker logs
gcloud run logs read store-logan-001-worker --region=us-central1 --limit=50
```

### 6.2 Configure Custom Domain (Optional)

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service=store-logan-001 \
  --domain=store-logan-001.codepop.com \
  --region=us-central1

# Get DNS records to configure
gcloud run domain-mappings describe \
  --domain=store-logan-001.codepop.com \
  --region=us-central1

# Add DNS records in your domain registrar:
# Type: CNAME
# Name: store-logan-001
# Value: ghs.googlehosted.com
#
# SSL certificate is automatically provisioned by Cloud Run
```

---

## 7. Multi-Store Deployment

### 7.1 Deployment Strategy

**Approach 1: Individual Services (Recommended for <50 stores)**
- Each store = separate Cloud Run service
- Each store = dedicated Cloud SQL instance
- Pros: Complete isolation, independent scaling, easier debugging
- Cons: Higher management overhead, higher minimum cost

**Approach 2: Shared Resources (Cost-Optimized for Development)**
- Multiple stores = shared Cloud SQL instance (separate databases)
- Multiple stores = shared Redis instance (namespaced)
- Pros: Lower cost, simpler management during development
- Cons: Less isolation, potential noisy neighbor issues

**Recommendation:** Start with Approach 2 for development (5-10 stores), migrate to Approach 1 for production.

### 7.2 Automated Multi-Store Deployment Script

**Create `deploy-store.sh` Script:**
```bash
#!/bin/bash
# deploy-store.sh - Automated store deployment script

set -e  # Exit on error

# Configuration
PROJECT_ID="codepop-production"
REGION="us-central1"
IMAGE_BASE="gcr.io/${PROJECT_ID}/codepop-store"
IMAGE_TAG="${1:-latest}"

# Store configuration (can be CSV file or array)
STORE_CONFIG_FILE="stores.csv"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to deploy a single store
deploy_store() {
    local STORE_ID=$1
    local STORE_NUMBER=$2
    local REGION_CODE=$3
    local LOCATION=$4

    log_info "Deploying store: ${STORE_ID} (${STORE_NUMBER}) in region ${REGION_CODE}"

    # 1. Create Cloud SQL instance
    log_info "Creating Cloud SQL instance..."
    gcloud sql instances create "store-${STORE_NUMBER}-db" \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=${REGION} \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --backup-start-time=03:00 \
        --quiet || log_warn "Database instance may already exist"

    # 2. Create database
    log_info "Creating database..."
    gcloud sql databases create "codepop_${STORE_NUMBER}" \
        --instance="store-${STORE_NUMBER}-db" \
        --quiet || log_warn "Database may already exist"

    # 3. Create Redis instance
    log_info "Creating Redis instance..."
    gcloud redis instances create "store-${STORE_NUMBER}-redis" \
        --size=1 \
        --region=${REGION} \
        --tier=basic \
        --redis-version=redis_7_0 \
        --quiet || log_warn "Redis instance may already exist"

    # 4. Get Redis connection info
    REDIS_HOST=$(gcloud redis instances describe "store-${STORE_NUMBER}-redis" \
        --region=${REGION} --format="value(host)")
    REDIS_PORT=$(gcloud redis instances describe "store-${STORE_NUMBER}-redis" \
        --region=${REGION} --format="value(port)")

    log_info "Redis: ${REDIS_HOST}:${REDIS_PORT}"

    # 5. Create storage bucket
    log_info "Creating storage bucket..."
    gsutil mb -l ${REGION} "gs://codepop-store-${STORE_NUMBER}" || log_warn "Bucket may already exist"

    # 6. Generate and store secrets
    log_info "Storing secrets..."
    python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" | \
        gcloud secrets create "django-secret-key-${STORE_NUMBER}" --data-file=- --quiet || log_warn "Secret may already exist"

    # 7. Deploy Cloud Run service
    log_info "Deploying Cloud Run service..."
    gcloud run deploy "store-${STORE_NUMBER}" \
        --image="${IMAGE_BASE}:${IMAGE_TAG}" \
        --platform=managed \
        --region=${REGION} \
        --allow-unauthenticated \
        --memory=512Mi \
        --cpu=1 \
        --timeout=300 \
        --max-instances=10 \
        --min-instances=0 \
        --concurrency=80 \
        --add-cloudsql-instances="${PROJECT_ID}:${REGION}:store-${STORE_NUMBER}-db" \
        --set-env-vars="STORE_ID=${STORE_ID},REGION_CODE=${REGION_CODE},IS_HUB=False,REDIS_HOST=${REDIS_HOST},REDIS_PORT=${REDIS_PORT},CLOUD_SQL_CONNECTION_NAME=${PROJECT_ID}:${REGION}:store-${STORE_NUMBER}-db,DB_NAME=codepop_${STORE_NUMBER},DB_USER=codepop_user,GS_BUCKET_NAME=codepop-store-${STORE_NUMBER},GCP_PROJECT_ID=${PROJECT_ID}" \
        --set-secrets="DB_PASSWORD=db-password-${STORE_NUMBER}:latest,SECRET_KEY=django-secret-key-${STORE_NUMBER}:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,MAPBOX_TOKEN=mapbox-token:latest,INTER_NODE_SECRET=inter-node-secret:latest" \
        --quiet

    # 8. Run migrations
    log_info "Running database migrations..."
    gcloud run jobs create "store-${STORE_NUMBER}-migrate" \
        --image="${IMAGE_BASE}:${IMAGE_TAG}" \
        --region=${REGION} \
        --add-cloudsql-instances="${PROJECT_ID}:${REGION}:store-${STORE_NUMBER}-db" \
        --set-env-vars="STORE_ID=${STORE_ID},REGION_CODE=${REGION_CODE},CLOUD_SQL_CONNECTION_NAME=${PROJECT_ID}:${REGION}:store-${STORE_NUMBER}-db,DB_NAME=codepop_${STORE_NUMBER},DB_USER=codepop_user,GCP_PROJECT_ID=${PROJECT_ID}" \
        --set-secrets="DB_PASSWORD=db-password-${STORE_NUMBER}:latest,SECRET_KEY=django-secret-key-${STORE_NUMBER}:latest" \
        --command="python" \
        --args="manage.py,migrate,--noinput" \
        --quiet || log_warn "Migration job may already exist"

    gcloud run jobs execute "store-${STORE_NUMBER}-migrate" --region=${REGION} --wait --quiet

    # 9. Deploy Celery worker
    log_info "Deploying Celery worker..."
    gcloud run deploy "store-${STORE_NUMBER}-worker" \
        --image="${IMAGE_BASE}:${IMAGE_TAG}" \
        --platform=managed \
        --region=${REGION} \
        --no-allow-unauthenticated \
        --memory=512Mi \
        --cpu=1 \
        --timeout=300 \
        --max-instances=5 \
        --min-instances=1 \
        --command="celery" \
        --args="-A,codepop,worker,-l,info" \
        --add-cloudsql-instances="${PROJECT_ID}:${REGION}:store-${STORE_NUMBER}-db" \
        --set-env-vars="STORE_ID=${STORE_ID},REGION_CODE=${REGION_CODE},REDIS_HOST=${REDIS_HOST},REDIS_PORT=${REDIS_PORT},CLOUD_SQL_CONNECTION_NAME=${PROJECT_ID}:${REGION}:store-${STORE_NUMBER}-db,DB_NAME=codepop_${STORE_NUMBER},DB_USER=codepop_user,GCP_PROJECT_ID=${PROJECT_ID}" \
        --set-secrets="DB_PASSWORD=db-password-${STORE_NUMBER}:latest,SECRET_KEY=django-secret-key-${STORE_NUMBER}:latest,INTER_NODE_SECRET=inter-node-secret:latest" \
        --quiet

    # 10. Get service URL
    SERVICE_URL=$(gcloud run services describe "store-${STORE_NUMBER}" \
        --region=${REGION} --format="value(status.url)")

    log_info "${GREEN}✓ Successfully deployed store ${STORE_ID}${NC}"
    log_info "Service URL: ${SERVICE_URL}"
    echo ""
}

# Main execution
log_info "Starting multi-store deployment..."
log_info "Project: ${PROJECT_ID}"
log_info "Region: ${REGION}"
log_info "Image: ${IMAGE_BASE}:${IMAGE_TAG}"
echo ""

# Read stores from CSV file
# Format: STORE_ID,STORE_NUMBER,REGION_CODE,LOCATION
# Example: LOGAN-001,logan-001,C,Logan UT
while IFS=',' read -r STORE_ID STORE_NUMBER REGION_CODE LOCATION; do
    # Skip header line
    if [[ "$STORE_ID" == "STORE_ID" ]]; then
        continue
    fi

    deploy_store "$STORE_ID" "$STORE_NUMBER" "$REGION_CODE" "$LOCATION"
done < "$STORE_CONFIG_FILE"

log_info "${GREEN}✓ All stores deployed successfully!${NC}"
```

**Create `stores.csv` Configuration:**
```csv
STORE_ID,STORE_NUMBER,REGION_CODE,LOCATION
LOGAN-001,logan-001,C,Logan UT
LOGAN-002,logan-002,C,Logan UT
DALLAS-001,dallas-001,D,Dallas TX
DALLAS-002,dallas-002,D,Dallas TX
CHICAGO-001,chicago-001,A,Chicago IL
```

**Run Deployment:**
```bash
# Make script executable
chmod +x deploy-store.sh

# Deploy all stores
./deploy-store.sh latest

# Or deploy specific version
./deploy-store.sh v1.0.0
```

### 7.3 Deploying Regional Supply Hubs

**Hub Configuration Differences:**
- Same Django codebase as stores
- Different environment variables: `IS_HUB=True`
- Additional endpoints for logistics coordination
- No customer-facing operations (no robotic machines)

**Deploy Hub Script (`deploy-hub.sh`):**
```bash
#!/bin/bash
# deploy-hub.sh - Deploy regional supply hub

set -e

HUB_ID=$1           # e.g., "LOGAN"
HUB_NUMBER=$2       # e.g., "hub-logan"
REGION_CODE=$3      # e.g., "C"
GCP_REGION=$4       # e.g., "us-central1"

PROJECT_ID="codepop-production"
IMAGE_BASE="gcr.io/${PROJECT_ID}/codepop-store"
IMAGE_TAG="${5:-latest}"

echo "Deploying supply hub: ${HUB_ID} (${HUB_NUMBER})"

# Similar steps as store deployment, but with IS_HUB=True
gcloud run deploy "${HUB_NUMBER}" \
    --image="${IMAGE_BASE}:${IMAGE_TAG}" \
    --platform=managed \
    --region=${GCP_REGION} \
    --allow-unauthenticated \
    --memory=1Gi \
    --cpu=1 \
    --timeout=300 \
    --max-instances=10 \
    --set-env-vars="STORE_ID=${HUB_ID},REGION_CODE=${REGION_CODE},IS_HUB=True,..." \
    # ... (rest similar to store deployment)

echo "✓ Hub ${HUB_ID} deployed successfully"
```

---

## 8. Mobile App Deployment

### 8.1 Expo Application Services (EAS) Setup

**Prerequisites:**
- Expo account (free tier available)
- Apple Developer account ($99/year for iOS deployment)
- Google Play Developer account ($25 one-time for Android deployment)

**Install EAS CLI:**
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Verify login
eas whoami
```

### 8.2 Configure EAS Build

**Create `eas.json` Configuration:**
```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store",
      "env": {
        "API_BASE_URL": "https://api.codepop.com"
      },
      "android": {
        "buildType": "aab"
      },
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**Update `app.json` Configuration:**
```json
{
  "expo": {
    "name": "CodePop",
    "slug": "codepop",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FF2E63"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.codepop.app",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "CodePop needs your location to find nearby stores and track order preparation.",
        "NSCameraUsageDescription": "CodePop needs camera access for QR code scanning."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FF2E63"
      },
      "package": "com.codepop.app",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow CodePop to use your location."
        }
      ]
    ]
  }
}
```

### 8.3 Build Process

**Initialize EAS Project:**
```bash
# Navigate to React Native project
cd /path/to/codepop/mobile

# Configure EAS for project
eas build:configure

# This creates eas.json and updates app.json with projectId
```

**Build for Development Testing:**
```bash
# Build development client (for testing on device)
eas build --profile development --platform android
eas build --profile development --platform ios

# Download and install on test devices
```

**Build Preview (Internal Testing):**
```bash
# Build APK for Android (easy distribution)
eas build --profile preview --platform android

# Build for iOS (TestFlight)
eas build --profile preview --platform ios
```

**Build for Production:**
```bash
# Build both platforms for app stores
eas build --profile production --platform all

# Or build separately
eas build --profile production --platform ios
eas build --profile production --platform android
```

### 8.4 Submit to App Stores

**Submit to Apple App Store:**
```bash
# Submit iOS build to App Store Connect
eas submit --platform ios --latest

# Or specify specific build
eas submit --platform ios --id <build-id>

# Follow prompts to complete submission
# Then go to App Store Connect to complete listing
```

**Submit to Google Play Store:**
```bash
# First, create service account in Google Play Console
# Download JSON key and save as google-play-service-account.json

# Submit Android build to Google Play
eas submit --platform android --latest

# Or specify specific build
eas submit --platform android --id <build-id>
```

### 8.5 Over-the-Air (OTA) Updates

**Configure OTA Updates:**
```bash
# Create update channels
eas channel:create production
eas channel:create staging

# Link channel to build profile
eas channel:edit production --branch production
```

**Push Updates:**
```bash
# Push update to production channel
eas update --branch production --message "Fixed order submission bug"

# Push update to staging first (for testing)
eas update --branch staging --message "Testing new features"

# Users will receive updates on next app launch
# No app store review required for JS/React Native code changes
```

**OTA Update Best Practices:**
- Only use for bug fixes and minor feature updates
- Major changes (native code, dependencies) require full rebuild
- Test on staging channel before pushing to production
- Monitor rollout with Expo's dashboard
- Can rollback to previous update if issues arise

---

## 9. CI/CD Pipeline

### 9.1 GitHub Actions for Backend Deployment

**Create `.github/workflows/deploy-backend.yml`:**
```yaml
name: Deploy Backend to Cloud Run

on:
  push:
    branches:
      - main
      - staging
  pull_request:
    branches:
      - main

env:
  GCP_PROJECT_ID: codepop-production
  GCP_REGION: us-central1
  IMAGE_NAME: codepop-store

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run linting
        run: |
          cd backend
          flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
          black --check .

      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379/0
        run: |
          cd backend
          python manage.py test --verbosity=2

      - name: Run security checks
        run: |
          cd backend
          safety check
          bandit -r . -x tests/

  build-and-deploy:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging')

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for GCP
        run: gcloud auth configure-docker

      - name: Build Docker image
        run: |
          cd backend
          docker build -t gcr.io/${{ env.GCP_PROJECT_ID }}/${{ env.IMAGE_NAME }}:${{ github.sha }} .
          docker tag gcr.io/${{ env.GCP_PROJECT_ID }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
                     gcr.io/${{ env.GCP_PROJECT_ID }}/${{ env.IMAGE_NAME }}:latest

      - name: Push Docker image
        run: |
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/${{ env.IMAGE_NAME }}:latest

      - name: Deploy to Cloud Run (Matrix)
        strategy:
          matrix:
            include:
              - store_id: LOGAN-001
                store_number: logan-001
                region_code: C
              - store_id: LOGAN-002
                store_number: logan-002
                region_code: C
              - store_id: DALLAS-001
                store_number: dallas-001
                region_code: D
        run: |
          gcloud run deploy store-${{ matrix.store_number }} \
            --image gcr.io/${{ env.GCP_PROJECT_ID }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --region ${{ env.GCP_REGION }} \
            --platform managed \
            --quiet

      - name: Run migrations
        strategy:
          matrix:
            include:
              - store_number: logan-001
              - store_number: logan-002
              - store_number: dallas-001
        run: |
          gcloud run jobs execute store-${{ matrix.store_number }}-migrate \
            --region ${{ env.GCP_REGION }} \
            --wait \
            --quiet

      - name: Notify on success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Backend deployment successful! :rocket:'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Backend deployment failed! :x:'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 9.2 GitHub Actions for Mobile Deployment

**Create `.github/workflows/deploy-mobile.yml`:**
```yaml
name: Deploy Mobile App to EAS

on:
  push:
    branches:
      - main
      - mobile/staging
  pull_request:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        run: |
          cd mobile
          npm ci

      - name: Run linting
        run: |
          cd mobile
          npm run lint

      - name: Run tests
        run: |
          cd mobile
          npm test -- --coverage

  build-preview:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: |
          cd mobile
          npm ci

      - name: Build preview (Android)
        run: |
          cd mobile
          eas build --profile preview --platform android --non-interactive

  deploy-production:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: |
          cd mobile
          npm ci

      - name: Publish OTA Update
        run: |
          cd mobile
          eas update --branch production --message "${{ github.event.head_commit.message }}"

      - name: Build production (if needed)
        if: contains(github.event.head_commit.message, '[build]')
        run: |
          cd mobile
          eas build --profile production --platform all --non-interactive
```

### 9.3 Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

```
GCP_SA_KEY               # Service account JSON key
GCP_PROJECT_ID           # codepop-production
EXPO_TOKEN               # Expo access token (from expo.dev)
SLACK_WEBHOOK            # Optional: Slack webhook for notifications
```

---

## 10. Monitoring and Logging

### 10.1 Django Instrumentation with Prometheus

**Install django-prometheus:**
```bash
pip install django-prometheus==2.3.1
```

**Configure Django Settings:**
```python
# settings.py

INSTALLED_APPS = [
    'django_prometheus',  # Must be first
    'django.contrib.admin',
    'django.contrib.auth',
    # ... other apps
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',  # Must be first
    'django.middleware.security.SecurityMiddleware',
    # ... other middleware
    'django_prometheus.middleware.PrometheusAfterMiddleware',  # Must be last
]

# Use instrumented database backend
DATABASES = {
    'default': {
        'ENGINE': 'django_prometheus.db.backends.postgresql',  # Changed
        # ... rest of config
    }
}

# Use instrumented cache backend (optional)
CACHES = {
    'default': {
        'BACKEND': 'django_prometheus.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
    }
}
```

**Add Metrics Endpoint:**
```python
# urls.py
from django.urls import path, include

urlpatterns = [
    path('', include('django_prometheus.urls')),  # Exposes /metrics
    # ... other URLs
]
```

### 10.2 Prometheus Configuration

**Deploy Prometheus (Docker Compose):**
```yaml
# monitoring/docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

**Prometheus Scrape Configuration:**
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'codepop-production'

scrape_configs:
  # Store: Logan-001
  - job_name: 'store-logan-001'
    static_configs:
      - targets: ['store-logan-001-xxxxx.run.app']
    metrics_path: '/metrics'
    scheme: 'https'

  # Store: Logan-002
  - job_name: 'store-logan-002'
    static_configs:
      - targets: ['store-logan-002-xxxxx.run.app']
    metrics_path: '/metrics'
    scheme: 'https'

  # Store: Dallas-001
  - job_name: 'store-dallas-001'
    static_configs:
      - targets: ['store-dallas-001-xxxxx.run.app']
    metrics_path: '/metrics'
    scheme: 'https'

  # Hub: Logan
  - job_name: 'hub-logan'
    static_configs:
      - targets: ['hub-logan-xxxxx.run.app']
    metrics_path: '/metrics'
    scheme: 'https'

# Alert rules
rule_files:
  - 'alerts.yml'
```

**Alert Rules:**
```yaml
# monitoring/alerts.yml
groups:
  - name: codepop_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(django_http_requests_total_by_view_transport_method_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value }} errors/sec"

      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(django_http_requests_latency_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High response time on {{ $labels.job }}"
          description: "95th percentile latency is {{ $value }}s"

      # Database connection issues
      - alert: DatabaseConnectionErrors
        expr: rate(django_db_errors_total[5m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection errors on {{ $labels.job }}"
          description: "{{ $value }} database errors/sec"

      # Celery queue backing up
      - alert: CeleryQueueBacklog
        expr: celery_queue_length > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Celery queue backlog on {{ $labels.job }}"
          description: "Queue length is {{ $value }} tasks"
```

### 10.3 Grafana Dashboards

**Import Pre-built Django Dashboard:**
1. Open Grafana (http://localhost:3000)
2. Login (admin / your-password)
3. Go to Dashboards → Import
4. Enter dashboard ID: **7996** (Django Prometheus Dashboard)
5. Select Prometheus data source
6. Click "Import"

**Key Metrics to Monitor:**
- **Request Rate**: `rate(django_http_requests_total_by_view_transport_method_total[5m])`
- **Error Rate**: `rate(django_http_requests_total_by_view_transport_method_total{status=~"5.."}[5m])`
- **Response Time (p95)**: `histogram_quantile(0.95, rate(django_http_requests_latency_seconds_bucket[5m]))`
- **Database Queries**: `rate(django_db_query_duration_seconds_count[5m])`
- **Celery Tasks**: `celery_tasks_total`

### 10.4 Google Cloud Monitoring (Alternative)

If you prefer built-in GCP monitoring over Prometheus:

**Enable Cloud Logging:**
```python
# settings.py
import google.cloud.logging

# Setup Cloud Logging
if IS_CLOUD_RUN:
    client = google.cloud.logging.Client()
    client.setup_logging()

    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'cloud_logging': {
                'class': 'google.cloud.logging.handlers.CloudLoggingHandler',
                'client': client,
            },
        },
        'loggers': {
            'django': {
                'handlers': ['cloud_logging'],
                'level': 'INFO',
            },
        },
    }
```

**View Logs:**
```bash
# View logs from Cloud Run service
gcloud run logs read store-logan-001 --region=us-central1 --limit=100

# Follow logs in real-time
gcloud run logs tail store-logan-001 --region=us-central1

# Filter logs by severity
gcloud run logs read store-logan-001 --region=us-central1 --log-filter="severity>=ERROR"
```

**Create Log-Based Metrics:**
```bash
# Create metric for 500 errors
gcloud logging metrics create http_500_errors \
  --description="Count of HTTP 500 errors" \
  --value-extractor="EXTRACT(jsonPayload.status)" \
  --log-filter='resource.type="cloud_run_revision" AND jsonPayload.status=500'
```

---

## 11. Security Implementation

### 11.1 Inter-Node Authentication

**Shared Secret Authentication:**
```python
# utils/auth.py
import hmac
import hashlib
import time
from django.conf import settings

def sign_request(payload: str, timestamp: int = None) -> tuple[str, int]:
    """
    Sign a request with HMAC-SHA256.
    Returns (signature, timestamp) tuple.
    """
    if timestamp is None:
        timestamp = int(time.time())

    message = f"{payload}:{timestamp}"
    signature = hmac.new(
        settings.INTER_NODE_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    return signature, timestamp

def verify_signature(payload: str, signature: str, timestamp: int, max_age: int = 300) -> bool:
    """
    Verify request signature.
    max_age: Maximum age of request in seconds (default 5 minutes).
    """
    # Check timestamp freshness
    current_time = int(time.time())
    if abs(current_time - timestamp) > max_age:
        return False

    # Verify signature
    expected_signature, _ = sign_request(payload, timestamp)
    return hmac.compare_digest(signature, expected_signature)
```

**Use in Views:**
```python
# views/inter_node.py
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from utils.auth import verify_signature

@csrf_exempt
@api_view(['POST'])
def replicate_user(request):
    """Endpoint for receiving user replication requests."""

    # Extract signature from headers
    signature = request.headers.get('X-CodePop-Signature')
    timestamp = request.headers.get('X-CodePop-Timestamp')

    if not signature or not timestamp:
        return Response(
            {'error': 'Missing authentication headers'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Verify signature
    try:
        timestamp = int(timestamp)
        payload = request.body.decode('utf-8')
        if not verify_signature(payload, signature, timestamp):
            return Response(
                {'error': 'Invalid signature'},
                status=status.HTTP_403_FORBIDDEN
            )
    except (ValueError, TypeError):
        return Response(
            {'error': 'Invalid timestamp'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Process replication
    user_data = request.data
    # ... implement replication logic

    return Response({'status': 'replicated'})
```

**Client-Side (Making Inter-Node Requests):**
```python
# services/inter_node.py
import requests
import json
from django.conf import settings
from utils.auth import sign_request

def send_replication_request(target_store_url: str, user_data: dict):
    """Send user data to another store."""

    # Prepare payload
    payload = json.dumps(user_data)
    signature, timestamp = sign_request(payload)

    # Make request with authentication headers
    headers = {
        'Content-Type': 'application/json',
        'X-CodePop-Signature': signature,
        'X-CodePop-Timestamp': str(timestamp),
    }

    response = requests.post(
        f'{target_store_url}/api/inter-node/replicate-user/',
        data=payload,
        headers=headers,
        timeout=10
    )

    response.raise_for_status()
    return response.json()
```

### 11.2 Store Registry Allowlist

**Maintain Known Stores:**
```python
# settings.py
KNOWN_STORES = [
    'store-logan-001.codepop.com',
    'store-logan-002.codepop.com',
    'store-dallas-001.codepop.com',
    'hub-logan.codepop.com',
    # ... all stores and hubs
]

# Or load from database
from models import Store, SupplyHub

def get_known_stores():
    stores = Store.objects.filter(is_operational=True).values_list('api_base_url', flat=True)
    hubs = SupplyHub.objects.filter(is_operational=True).values_list('api_base_url', flat=True)
    return list(stores) + list(hubs)
```

**Verify Peer Store:**
```python
# middleware/peer_verification.py
from django.http import JsonResponse
from django.conf import settings

class PeerVerificationMiddleware:
    """Verify requests from peer stores."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only check inter-node endpoints
        if request.path.startswith('/api/inter-node/'):
            origin = request.headers.get('Origin') or request.META.get('HTTP_REFERER', '')

            # Extract domain from origin
            if origin:
                from urllib.parse import urlparse
                domain = urlparse(origin).netloc

                # Check if domain is in allowlist
                if domain not in settings.KNOWN_STORES:
                    return JsonResponse(
                        {'error': 'Unknown peer store'},
                        status=403
                    )

        return self.get_response(request)
```

### 11.3 HTTPS/TLS Configuration

**Enforce HTTPS in Django:**
```python
# settings.py

# Security settings for production
if IS_CLOUD_RUN:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
```

**Cloud Run automatically provides:**
- TLS 1.3 encryption
- Automatic SSL certificate provisioning
- HTTPS redirects

### 11.4 Secrets Rotation

**Rotate Secrets Script:**
```bash
#!/bin/bash
# rotate-secrets.sh - Rotate sensitive secrets

SECRET_NAME=$1
PROJECT_ID="codepop-production"

# Generate new secret value
NEW_SECRET=$(openssl rand -base64 32)

# Add new version to Secret Manager
echo -n "$NEW_SECRET" | gcloud secrets versions add "$SECRET_NAME" \
  --project="$PROJECT_ID" \
  --data-file=-

# Disable old version (keep for rollback)
OLD_VERSION=$(gcloud secrets versions list "$SECRET_NAME" \
  --project="$PROJECT_ID" \
  --format="value(name)" \
  --filter="state=ENABLED" \
  --limit=1 \
  --sort-by="~createTime" \
  | head -n 1)

gcloud secrets versions disable "$OLD_VERSION" \
  --secret="$SECRET_NAME" \
  --project="$PROJECT_ID"

echo "Rotated secret: $SECRET_NAME"
echo "Old version: $OLD_VERSION (disabled)"
```

---

## 12. Implementation Roadmap

### Week 1-2: Infrastructure Setup
- [ ] Create GCP account and project
- [ ] Enable required APIs
- [ ] Set up service accounts and IAM
- [ ] Configure gcloud CLI locally
- [ ] Create first Cloud SQL instance (dev)
- [ ] Create first Redis instance (dev)
- [ ] Set up Secret Manager with initial secrets

### Week 3-4: Single Store Deployment
- [ ] Containerize Django application
- [ ] Create production Dockerfile
- [ ] Deploy first store to Cloud Run
- [ ] Configure Cloud SQL connection
- [ ] Test API endpoints
- [ ] Deploy Celery workers
- [ ] Verify database migrations
- [ ] Test inter-service communication

### Week 5-6: Multi-Store Deployment
- [ ] Create `deploy-store.sh` automation script
- [ ] Create `stores.csv` configuration
- [ ] Deploy 3-5 test stores
- [ ] Implement store registry/discovery
- [ ] Test store-to-store communication
- [ ] Deploy first regional hub
- [ ] Test hub-to-store communication

### Week 7-8: CI/CD Pipeline
- [ ] Create GitHub Actions workflows
- [ ] Configure deployment matrix
- [ ] Set up automated testing
- [ ] Configure secret management in CI
- [ ] Test automated deployments
- [ ] Set up deployment notifications

### Week 9-10: Mobile App Deployment
- [ ] Configure EAS for Expo project
- [ ] Create build profiles (dev/staging/prod)
- [ ] Build and test iOS app
- [ ] Build and test Android app
- [ ] Submit to TestFlight (iOS internal testing)
- [ ] Submit to Google Play (internal testing)
- [ ] Configure OTA updates
- [ ] Test update distribution

### Week 11-12: Monitoring and Security
- [ ] Deploy Prometheus and Grafana
- [ ] Configure django-prometheus
- [ ] Import Grafana dashboards
- [ ] Set up alerting rules
- [ ] Implement inter-node authentication
- [ ] Configure HTTPS/TLS
- [ ] Security audit (OWASP Top 10)
- [ ] Load testing with Locust

### Week 13-14: Documentation and Handoff
- [ ] Document deployment procedures
- [ ] Create troubleshooting guide
- [ ] Write operational runbooks
- [ ] Train team on deployment process
- [ ] Disaster recovery testing
- [ ] Final cost optimization review

---

## 13. Troubleshooting

### Common Issues and Solutions

**Issue: Cloud Run service returns 502 Bad Gateway**
```
Cause: Application failed to start or crashed immediately
Solution:
1. Check logs: gcloud run logs read store-logan-001 --region=us-central1 --limit=50
2. Verify environment variables are set correctly
3. Test Docker image locally: docker run -p 8080:8080 <image-name>
4. Check if database connection is working
```

**Issue: Database connection timeout**
```
Cause: Cloud SQL not accessible from Cloud Run
Solution:
1. Verify --add-cloudsql-instances flag is set correctly
2. Check Cloud SQL instance is running: gcloud sql instances list
3. Verify database user permissions: gcloud sql users list --instance=<instance>
4. Test connection using Cloud Shell:
   gcloud sql connect <instance> --user=<username> --database=<dbname>
```

**Issue: Celery tasks not executing**
```
Cause: Celery worker not running or Redis connection issue
Solution:
1. Check Celery worker logs: gcloud run logs read store-logan-001-worker
2. Verify Redis instance is operational: gcloud redis instances list
3. Check REDIS_HOST and REDIS_PORT environment variables
4. Test Redis connection: redis-cli -h <host> -p <port> ping
```

**Issue: Inter-node requests failing with 403 Forbidden**
```
Cause: Signature verification failing
Solution:
1. Verify INTER_NODE_SECRET is same across all stores
2. Check system clocks are synchronized (timestamp verification)
3. Ensure request body is not modified in transit
4. Test with timestamp tolerance: increase max_age parameter temporarily
```

**Issue: Static files not loading (404 errors)**
```
Cause: Cloud Storage bucket not configured correctly
Solution:
1. Verify bucket exists: gsutil ls
2. Check bucket permissions: gsutil iam get gs://<bucket-name>
3. Run collectstatic: python manage.py collectstatic --noinput
4. Verify GS_BUCKET_NAME environment variable is set
```

**Issue: Expo build failing**
```
Cause: Missing credentials or configuration
Solution:
1. Check eas.json configuration is correct
2. Verify Expo account is logged in: eas whoami
3. For iOS: Check Apple Developer credentials in Expo
4. For Android: Verify signing key is configured
5. Check build logs: eas build:list
```

**Issue: High Cloud SQL costs**
```
Cause: Over-provisioned instances or auto-storage increase
Solution:
1. Check instance tier: gcloud sql instances describe <instance>
2. Monitor actual CPU/memory usage in Cloud Console
3. Consider downgrading to db-f1-micro for low-traffic stores
4. Set storage auto-increase limit to prevent runaway costs
```

---

## 14. References

### Official Documentation
- [Google Cloud Platform Documentation](https://cloud.google.com/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)
- [Memorystore for Redis](https://cloud.google.com/memorystore/docs/redis)
- [Django Documentation](https://docs.djangoproject.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

### Tutorials and Guides
- [Django on Cloud Run (Google Codelabs)](https://codelabs.developers.google.com/codelabs/cloud-run-django)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/)
- [Celery Best Practices](https://docs.celeryproject.org/en/stable/userguide/optimizing.html)
- [Prometheus + Django Integration](https://github.com/korfuri/django-prometheus)

### Cost Management
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
- [GCP Free Tier](https://cloud.google.com/free)
- [Cost Optimization Best Practices](https://cloud.google.com/architecture/framework/cost-optimization)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security](https://docs.djangoproject.com/en/5.1/topics/security/)
- [Cloud Run Security](https://cloud.google.com/run/docs/securing/overview)

---

**Document Version:** 1.0
**Last Updated:** February 13, 2026
**Maintained By:** CodePop Development Team
