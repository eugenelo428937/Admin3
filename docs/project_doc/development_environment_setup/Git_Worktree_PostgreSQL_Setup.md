# Git Worktree with PostgreSQL Database Setup Guide

## Table of Contents
1. [Overview](#overview)
2. [What is Git Worktree?](#what-is-git-worktree)
3. [Why Use Worktree with Admin3?](#why-use-worktree-with-admin3)
4. [Database Isolation Strategies](#database-isolation-strategies)
5. [Setup Methods](#setup-methods)
6. [Step-by-Step Setup](#step-by-step-setup)
7. [Common Workflows](#common-workflows)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Overview

Git worktree allows you to check out multiple branches simultaneously in separate directories. This guide provides step-by-step instructions for setting up git worktree with the Admin3 project while managing PostgreSQL database isolation.

**Key Challenge**: Multiple worktrees share the same git repository but need isolated database environments to prevent data corruption and migration conflicts.

## What is Git Worktree?

Git worktree enables you to maintain multiple working directories from a single git repository. Each worktree can have a different branch checked out, allowing you to:

- Work on multiple features simultaneously without switching branches
- Test code from different branches side-by-side
- Run different versions of the application concurrently
- Quickly switch contexts without stashing changes

### Traditional Workflow vs Worktree Workflow

**Traditional Workflow:**
```bash
# Switch branches (must commit or stash changes)
git checkout main
git checkout feature-branch
# Can only work on one branch at a time
```

**Worktree Workflow:**
```bash
# Create separate working directory for feature branch
git worktree add ../Admin3-feature feature-branch

# Both branches available simultaneously
C:\Code\Admin3\              (main branch)
C:\Code\Admin3-feature\      (feature-branch)
```

## Why Use Worktree with Admin3?

### Use Cases for Admin3 Project

1. **Parallel Feature Development**
   - Work on Epic 3 (VAT system) in one worktree
   - Fix urgent bug in main branch in another worktree
   - No need to commit unfinished work or stash changes

2. **Testing and Comparison**
   - Compare frontend behavior between branches
   - Test database migrations on feature branch while main stays stable
   - Run different backend/frontend combinations

3. **Code Review and Testing**
   - Checkout PR branch in separate worktree for review
   - Test changes without affecting your current work
   - Run test suites in parallel environments

4. **Hotfix Workflow**
   - Keep feature work untouched in main worktree
   - Create hotfix worktree from production branch
   - Deploy hotfix without disrupting feature development

## Database Isolation Strategies

### Strategy Comparison

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| **Separate Databases** | Complete isolation, no conflicts | More disk space, separate migrations | Parallel development |
| **Separate Schemas** | Less disk space, shared reference data | Schema management complexity | Related feature work |
| **Docker Containers** | Full environment isolation, reproducible | Docker overhead, more complex setup | Team environments |
| **Database per Port** | Simple setup, complete isolation | Port management required | Quick feature testing |

### Recommended Strategy for Admin3

**Method: Separate Databases Per Worktree**

This is the recommended approach because:
- Complete data isolation prevents conflicts
- Each worktree can run migrations independently
- Easy to set up and manage
- Minimal configuration changes needed

## Setup Methods

### Method 1: Manual Database Setup (Simple)

**Quick setup for individual developers**

#### Pros:
- Simple and straightforward
- Full control over configuration
- Easy to understand and maintain

#### Cons:
- Manual database creation for each worktree
- Environment file management required

### Method 2: Automated Script Setup (Recommended)

**Scripted setup for consistent environments**

#### Pros:
- Consistent configuration across worktrees
- Automated database creation and setup
- Less room for configuration errors

#### Cons:
- Initial script setup required
- Need to maintain setup scripts

### Method 3: Docker Container Setup (Advanced)

**Complete environment isolation**

#### Pros:
- Full environment isolation
- Reproducible across machines
- Can share database containers

#### Cons:
- Docker knowledge required
- Higher resource usage
- More complex troubleshooting

## Step-by-Step Setup

### Prerequisites

Before setting up git worktree, ensure you have:

- Git version 2.5+ (worktree support)
- PostgreSQL installed and running
- Admin3 project cloned and configured
- Python virtual environment working
- Node.js and npm installed

**Check Prerequisites:**
```bash
# Check git version (should be 2.5+)
git --version

# Check PostgreSQL is running
psql --version
pg_isready

# Verify Python environment
python --version
```

### Method 1: Manual Setup (Step-by-Step)

This method walks through creating a worktree with separate database manually.

#### Step 1: Create Worktree Directory

```bash
# From main worktree directory
cd C:\Code\Admin3

# Create worktree for feature branch
git worktree add ..\Admin3-feature feature-branch

# Verify worktree created
git worktree list
```

**Output:**
```
C:/Code/Admin3         abcd123 [main]
C:/Code/Admin3-feature efgh456 [feature-branch]
```

#### Step 2: Create Separate PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create new database for worktree
CREATE DATABASE admin3_feature;

# Grant permissions to your user
GRANT ALL PRIVILEGES ON DATABASE admin3_feature TO your_db_user;

# Exit psql
\q
```

**For Windows (PowerShell):**
```powershell
# Create database using psql command
& "C:\Program Files\PostgreSQL\14\bin\psql.exe" -U postgres -c "CREATE DATABASE admin3_feature;"
```

#### Step 3: Configure Environment Variables

```bash
# Navigate to new worktree
cd ..\Admin3-feature

# Copy environment file from main worktree
copy ..\Admin3\backend\django_Admin3\.env.local .env.local

# Edit .env.local with new database name
```

**Update `.env.local` in worktree:**
```env
# Database Configuration
DB_NAME=admin3_feature
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

# Django Settings
SECRET_KEY=your_secret_key_here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Frontend URL (use different port if running both simultaneously)
FRONTEND_URL=http://localhost:3001
```

#### Step 4: Setup Python Virtual Environment

```bash
# Create virtual environment for worktree
cd backend\django_Admin3
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Note**: You can also reuse the main worktree's virtual environment if you don't need different package versions:

```bash
# Option: Reuse main worktree venv (faster setup)
# Edit activate script or use absolute path
C:\Code\Admin3\backend\django_Admin3\.venv\Scripts\activate
```

#### Step 5: Run Database Migrations

```bash
# Ensure you're in the worktree backend directory
cd C:\Code\Admin3-feature\backend\django_Admin3

# Activate virtual environment
.\.venv\Scripts\activate

# Run migrations on new database
python manage.py migrate

# Verify migrations applied
python manage.py showmigrations
```

#### Step 6: Load Initial Data (Optional)

```bash
# If you need test data, import from main database
pg_dump -U postgres admin3_dev > admin3_dump.sql
psql -U postgres -d admin3_feature < admin3_dump.sql

# Or use Django fixtures
python manage.py loaddata initial_data.json
```

#### Step 7: Setup Frontend (if needed)

```bash
# Navigate to frontend directory
cd ..\..\frontend\react-Admin3

# Install dependencies (or reuse node_modules)
npm install

# Update .env for different port
```

**Update `frontend/react-Admin3/.env`:**
```env
REACT_APP_API_URL=http://localhost:8889/api
PORT=3001
```

#### Step 8: Start Development Servers

```bash
# Terminal 1: Backend (different port)
cd C:\Code\Admin3-feature\backend\django_Admin3
.\.venv\Scripts\activate
python manage.py runserver 8889

# Terminal 2: Frontend (different port)
cd C:\Code\Admin3-feature\frontend\react-Admin3
npm start
```

### Method 2: Automated Script Setup

Create a PowerShell script to automate worktree creation with database setup.

#### Create Setup Script

**File: `C:\Code\Admin3\scripts\create-worktree.ps1`**

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$BranchName,

    [Parameter(Mandatory=$false)]
    [string]$WorktreePath,

    [Parameter(Mandatory=$false)]
    [int]$BackendPort = 8889,

    [Parameter(Mandatory=$false)]
    [int]$FrontendPort = 3001
)

# Set default worktree path if not provided
if (-not $WorktreePath) {
    $WorktreePath = "..\Admin3-$BranchName"
}

# Database name from branch (replace slashes with underscores)
$DbName = "admin3_$($BranchName.Replace('/', '_').Replace('-', '_'))"

Write-Host "Creating worktree setup for branch: $BranchName" -ForegroundColor Green
Write-Host "Worktree path: $WorktreePath" -ForegroundColor Cyan
Write-Host "Database name: $DbName" -ForegroundColor Cyan
Write-Host "Backend port: $BackendPort" -ForegroundColor Cyan
Write-Host "Frontend port: $FrontendPort" -ForegroundColor Cyan

# Step 1: Create git worktree
Write-Host "`n[1/7] Creating git worktree..." -ForegroundColor Yellow
git worktree add $WorktreePath $BranchName
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create worktree" -ForegroundColor Red
    exit 1
}

# Step 2: Create PostgreSQL database
Write-Host "`n[2/7] Creating PostgreSQL database..." -ForegroundColor Yellow
$psqlPath = "C:\Program Files\PostgreSQL\14\bin\psql.exe"
& $psqlPath -U postgres -c "CREATE DATABASE $DbName;"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Database creation failed (may already exist)" -ForegroundColor Yellow
}

# Step 3: Setup backend environment file
Write-Host "`n[3/7] Configuring backend environment..." -ForegroundColor Yellow
$envPath = Join-Path $WorktreePath "backend\django_Admin3\.env.local"
$mainEnvPath = "backend\django_Admin3\.env.local"

# Copy and modify environment file
if (Test-Path $mainEnvPath) {
    Copy-Item $mainEnvPath $envPath
    (Get-Content $envPath) -replace 'DB_NAME=.*', "DB_NAME=$DbName" `
                            -replace 'FRONTEND_URL=.*', "FRONTEND_URL=http://localhost:$FrontendPort" `
                            | Set-Content $envPath
    Write-Host "Environment file configured" -ForegroundColor Green
}

# Step 4: Setup Python virtual environment
Write-Host "`n[4/7] Setting up Python virtual environment..." -ForegroundColor Yellow
$backendPath = Join-Path $WorktreePath "backend\django_Admin3"
Push-Location $backendPath

python -m venv .venv
& ".venv\Scripts\activate"
pip install -r requirements.txt

Pop-Location
Write-Host "Virtual environment created" -ForegroundColor Green

# Step 5: Run migrations
Write-Host "`n[5/7] Running database migrations..." -ForegroundColor Yellow
Push-Location $backendPath
& ".venv\Scripts\python.exe" manage.py migrate
Pop-Location
Write-Host "Migrations completed" -ForegroundColor Green

# Step 6: Setup frontend environment
Write-Host "`n[6/7] Configuring frontend environment..." -ForegroundColor Yellow
$frontendEnvPath = Join-Path $WorktreePath "frontend\react-Admin3\.env"
@"
REACT_APP_API_URL=http://localhost:$BackendPort/api
PORT=$FrontendPort
"@ | Set-Content $frontendEnvPath
Write-Host "Frontend environment configured" -ForegroundColor Green

# Step 7: Install frontend dependencies (optional)
Write-Host "`n[7/7] Frontend dependencies..." -ForegroundColor Yellow
Write-Host "Skipping npm install (reuse node_modules from main)" -ForegroundColor Cyan

# Summary
Write-Host "`n✓ Worktree setup complete!" -ForegroundColor Green
Write-Host "`nTo start development servers:" -ForegroundColor Cyan
Write-Host "Backend:  cd $WorktreePath\backend\django_Admin3 && .\.venv\Scripts\activate && python manage.py runserver $BackendPort" -ForegroundColor White
Write-Host "Frontend: cd $WorktreePath\frontend\react-Admin3 && npm start" -ForegroundColor White
Write-Host "`nDatabase: $DbName" -ForegroundColor White
Write-Host "Ports: Backend=$BackendPort, Frontend=$FrontendPort" -ForegroundColor White
```

#### Using the Script

```powershell
# Make scripts directory
mkdir scripts

# Save script as create-worktree.ps1

# Make script executable (run PowerShell as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Create worktree with defaults
.\scripts\create-worktree.ps1 -BranchName "feature/vat-system"

# Create worktree with custom settings
.\scripts\create-worktree.ps1 -BranchName "hotfix/cart-bug" `
                              -WorktreePath "C:\Code\Admin3-hotfix" `
                              -BackendPort 8890 `
                              -FrontendPort 3002
```

### Method 3: Docker Container Setup

For complete environment isolation using Docker.

#### Docker Compose Configuration

**File: `docker-compose.worktree.yml` (in worktree directory)**

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    container_name: admin3_${BRANCH_NAME}_db
    environment:
      POSTGRES_DB: admin3_${BRANCH_NAME}
      POSTGRES_USER: admin3_user
      POSTGRES_PASSWORD: admin3_password
    ports:
      - "${DB_PORT:-5433}:5432"
    volumes:
      - postgres_data_${BRANCH_NAME}:/var/lib/postgresql/data
    networks:
      - admin3_${BRANCH_NAME}

  backend:
    build:
      context: ./backend/django_Admin3
      dockerfile: Dockerfile
    container_name: admin3_${BRANCH_NAME}_backend
    environment:
      DB_HOST: db
      DB_NAME: admin3_${BRANCH_NAME}
      DB_USER: admin3_user
      DB_PASSWORD: admin3_password
    ports:
      - "${BACKEND_PORT:-8889}:8000"
    depends_on:
      - db
    volumes:
      - ./backend/django_Admin3:/app
    networks:
      - admin3_${BRANCH_NAME}

volumes:
  postgres_data_${BRANCH_NAME}:

networks:
  admin3_${BRANCH_NAME}:
    driver: bridge
```

#### Docker Setup Steps

```bash
# Create worktree
git worktree add ..\Admin3-feature feature-branch

# Navigate to worktree
cd ..\Admin3-feature

# Set environment variables
$env:BRANCH_NAME = "feature"
$env:DB_PORT = "5433"
$env:BACKEND_PORT = "8889"

# Start Docker containers
docker-compose -f docker-compose.worktree.yml up -d

# Run migrations
docker-compose -f docker-compose.worktree.yml exec backend python manage.py migrate

# View logs
docker-compose -f docker-compose.worktree.yml logs -f
```

## Common Workflows

### Daily Development Workflow

#### Working Across Multiple Worktrees

```bash
# Morning: Start both environments

# Terminal 1: Main worktree (ongoing feature)
cd C:\Code\Admin3
.\.venv\Scripts\activate
python manage.py runserver 8888

# Terminal 2: Feature worktree (new feature)
cd C:\Code\Admin3-feature
.\.venv\Scripts\activate
python manage.py runserver 8889

# Now you can work on both simultaneously
```

#### Switching Between Worktrees

```bash
# Check which worktrees exist
git worktree list

# Navigate between worktrees
cd C:\Code\Admin3              # Main worktree
cd C:\Code\Admin3-feature      # Feature worktree
cd C:\Code\Admin3-hotfix       # Hotfix worktree

# Each maintains its own:
# - Checked out branch
# - Working directory state
# - Uncommitted changes
# - Virtual environment
# - Database
```

### Database Management Workflows

#### Syncing Data Between Worktrees

```bash
# Export data from main worktree database
pg_dump -U postgres admin3_dev > main_data.sql

# Import to feature worktree database
psql -U postgres -d admin3_feature < main_data.sql

# Or sync specific tables only
pg_dump -U postgres -t products -t subjects admin3_dev | psql -U postgres admin3_feature
```

#### Applying Migrations Across Worktrees

```bash
# Create migration in feature worktree
cd C:\Code\Admin3-feature\backend\django_Admin3
python manage.py makemigrations vat

# Test migration in feature database
python manage.py migrate

# If successful, merge to main and apply there
cd C:\Code\Admin3
git merge feature-branch
python manage.py migrate
```

#### Database Cleanup

```bash
# List all databases
psql -U postgres -c "\l"

# Drop database when worktree no longer needed
psql -U postgres -c "DROP DATABASE admin3_feature;"

# Or keep database for reference/comparison
```

### Hotfix Workflow with Worktree

```bash
# Step 1: Create hotfix worktree from main/production
cd C:\Code\Admin3
git worktree add ..\Admin3-hotfix main

# Step 2: Create hotfix database
psql -U postgres -c "CREATE DATABASE admin3_hotfix;"

# Step 3: Setup environment (automated)
.\scripts\create-worktree.ps1 -BranchName "hotfix/critical-bug" `
                              -BackendPort 8890

# Step 4: Make minimal fix in hotfix worktree
cd ..\Admin3-hotfix
git checkout -b hotfix/critical-bug
# ... make fix ...
git add .
git commit -m "hotfix: resolve critical security issue"

# Step 5: Test in isolated environment
python manage.py test
python manage.py runserver 8890

# Step 6: Push and create PR
git push origin hotfix/critical-bug

# Step 7: After merge, update main worktree
cd C:\Code\Admin3
git pull origin main

# Step 8: Cleanup hotfix worktree
git worktree remove ..\Admin3-hotfix
psql -U postgres -c "DROP DATABASE admin3_hotfix;"
```

### Code Review Workflow

```bash
# Step 1: Create worktree for PR review
git worktree add ..\Admin3-pr-review origin/feature/new-feature

# Step 2: Setup database for testing
psql -U postgres -c "CREATE DATABASE admin3_pr_review;"

# Step 3: Configure and run migrations
cd ..\Admin3-pr-review\backend\django_Admin3
# ... setup env, run migrations ...

# Step 4: Test the PR
python manage.py test
python manage.py runserver 8891

# Step 5: Review code and test functionality
# ... thorough testing ...

# Step 6: Leave PR feedback and cleanup
cd C:\Code\Admin3
git worktree remove ..\Admin3-pr-review
psql -U postgres -c "DROP DATABASE admin3_pr_review;"
```

## Best Practices

### Worktree Organization

#### Naming Conventions

```bash
# Descriptive worktree directory names
Admin3-feature-vat          # Feature worktree
Admin3-hotfix-cart          # Hotfix worktree
Admin3-review-pr123         # Code review worktree
Admin3-experiment           # Experimental/spike worktree

# Corresponding database names
admin3_feature_vat
admin3_hotfix_cart
admin3_review_pr123
admin3_experiment
```

#### Directory Structure

```
C:\Code\
├── Admin3\                    # Main worktree (main branch)
│   ├── .git\                  # Git repository (shared)
│   ├── backend\
│   ├── frontend\
│   └── .env.local             # DB: admin3_dev
│
├── Admin3-feature\            # Feature worktree
│   ├── backend\
│   ├── frontend\
│   └── .env.local             # DB: admin3_feature
│
└── Admin3-hotfix\             # Hotfix worktree
    ├── backend\
    ├── frontend\
    └── .env.local             # DB: admin3_hotfix
```

### Environment Configuration

#### Port Assignment Strategy

```bash
# Main worktree (default ports)
Backend:  8888
Frontend: 3000
Database: 5432 (default PostgreSQL)

# Feature worktree
Backend:  8889
Frontend: 3001
Database: 5432 (different database name)

# Hotfix worktree
Backend:  8890
Frontend: 3002
Database: 5432 (different database name)

# Review worktree
Backend:  8891
Frontend: 3003
Database: 5432 (different database name)
```

#### Environment File Template

Create a template for quick worktree setup:

**File: `.env.worktree.template`**
```env
# Database Configuration
DB_NAME=admin3_{{WORKTREE_NAME}}
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django Settings
SECRET_KEY={{SECRET_KEY}}
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Ports
BACKEND_PORT={{BACKEND_PORT}}
FRONTEND_URL=http://localhost:{{FRONTEND_PORT}}

# Feature Flags
ENABLE_DEBUG_TOOLBAR=True
```

### Database Management

#### Database Isolation Checklist

- [ ] Each worktree has unique database name
- [ ] Database name clearly identifies worktree purpose
- [ ] Migrations run independently per worktree
- [ ] Test data isolated between worktrees
- [ ] Cleanup procedures documented

#### Migration Best Practices

```bash
# Always create migrations in feature worktree first
cd C:\Code\Admin3-feature
python manage.py makemigrations

# Test migration thoroughly
python manage.py migrate
python manage.py test

# Document migration dependencies
# migrations/0123_add_vat_fields.py
"""
Migration: Add VAT calculation fields
Dependencies:
  - Requires feature worktree database
  - Safe to apply to main after testing
"""

# Only merge to main after successful testing
```

### Resource Management

#### When to Create New Worktree

**✓ Good Use Cases:**
- Long-running feature development
- Hotfix that can't wait for current work
- Code review of complex PRs
- Testing migrations that might break database
- Experimental/spike work

**✗ Avoid Creating Worktree For:**
- Quick bug fixes (use stash instead)
- Simple file edits
- Documentation updates
- Very short-lived branches

#### Cleanup Procedures

```bash
# Regular cleanup (weekly)
# List all worktrees
git worktree list

# Remove completed worktrees
git worktree remove ..\Admin3-completed-feature

# Prune deleted worktrees
git worktree prune

# List and cleanup databases
psql -U postgres -c "\l" | grep admin3_
psql -U postgres -c "DROP DATABASE admin3_completed_feature;"
```

#### Disk Space Management

```bash
# Check database sizes
psql -U postgres -c "
SELECT
    datname,
    pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname LIKE 'admin3_%'
ORDER BY pg_database_size(datname) DESC;"

# Archive old databases instead of dropping
pg_dump -U postgres admin3_old_feature > backups/admin3_old_feature.sql
psql -U postgres -c "DROP DATABASE admin3_old_feature;"
```

### Virtual Environment Sharing

#### Reuse Virtual Environment (Faster Setup)

```bash
# Use main worktree's venv (if package versions match)
# In worktree backend directory, create symlink or use absolute path

# Windows: Use absolute path in activation
C:\Code\Admin3\backend\django_Admin3\.venv\Scripts\activate

# Or create symbolic link (requires admin privileges)
mklink /D .venv C:\Code\Admin3\backend\django_Admin3\.venv
```

#### Separate Virtual Environments (Full Isolation)

```bash
# Create dedicated venv per worktree
cd C:\Code\Admin3-feature\backend\django_Admin3
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Git Operations

#### Sharing Commits Between Worktrees

```bash
# Worktrees share the same git repository
# Commits in one worktree are immediately visible in others

# In feature worktree
cd C:\Code\Admin3-feature
git add .
git commit -m "feat: add VAT calculation"

# In main worktree - see the commit
cd C:\Code\Admin3
git log --all --oneline | grep "VAT calculation"

# Cherry-pick commit to different worktree branch
git cherry-pick <commit-hash>
```

#### Branch Management

```bash
# You CANNOT checkout same branch in multiple worktrees
# This will fail:
git worktree add ..\Admin3-dup main  # Error: main is already checked out

# Solution: Create new branch in worktree
git worktree add ..\Admin3-experiment -b experiment-branch

# Or checkout different branch
git worktree add ..\Admin3-staging staging
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Port Already in Use

**Problem:**
```bash
Error: That port is already in use.
```

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :8889

# Kill process (PowerShell as admin)
Stop-Process -Id <PID> -Force

# Or use different port
python manage.py runserver 8891
```

#### Issue 2: Database Connection Refused

**Problem:**
```bash
django.db.utils.OperationalError: could not connect to server
```

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -U postgres -c "\l" | grep admin3_feature

# Check connection settings in .env.local
cat backend/django_Admin3/.env.local

# Test connection manually
psql -U postgres -d admin3_feature -c "SELECT 1;"
```

#### Issue 3: Migration Conflicts

**Problem:**
```bash
Conflicting migrations detected; multiple leaf nodes in the migration graph
```

**Solution:**
```bash
# In feature worktree
# Merge latest migrations from main
cd C:\Code\Admin3
git pull origin main

cd C:\Code\Admin3-feature
git merge main

# If conflicts in migrations
python manage.py makemigrations --merge

# Test merged migrations
python manage.py migrate
python manage.py test
```

#### Issue 4: Worktree Removal Failed

**Problem:**
```bash
Error: worktree contains modified or untracked files
```

**Solution:**
```bash
# Option 1: Force remove (loses changes)
git worktree remove ..\Admin3-feature --force

# Option 2: Commit or stash changes first
cd ..\Admin3-feature
git add .
git commit -m "WIP: save work"
# Then remove from main worktree
cd C:\Code\Admin3
git worktree remove ..\Admin3-feature

# Option 3: Move worktree elsewhere for safekeeping
move C:\Code\Admin3-feature C:\Code\Archive\Admin3-feature-backup
git worktree prune
```

#### Issue 5: Virtual Environment Activation Failed

**Problem:**
```bash
& : File cannot be loaded because running scripts is disabled
```

**Solution:**
```powershell
# PowerShell execution policy issue
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or bypass for single session
powershell -ExecutionPolicy Bypass
.\.venv\Scripts\activate
```

#### Issue 6: Database Already Exists

**Problem:**
```bash
ERROR: database "admin3_feature" already exists
```

**Solution:**
```bash
# Option 1: Use existing database (if safe)
# Skip database creation, just run migrations

# Option 2: Drop and recreate
psql -U postgres -c "DROP DATABASE admin3_feature;"
psql -U postgres -c "CREATE DATABASE admin3_feature;"

# Option 3: Use different database name
# Update .env.local with unique name
DB_NAME=admin3_feature_v2
```

#### Issue 7: Frontend Build Conflicts

**Problem:**
```bash
Module not found: Can't resolve 'component'
```

**Solution:**
```bash
# node_modules conflict between worktrees
# Option 1: Separate node_modules per worktree
cd C:\Code\Admin3-feature\frontend\react-Admin3
rm -rf node_modules
npm install

# Option 2: Use npm workspaces (advanced)
# Option 3: Share node_modules via symlink (requires matching package.json)
```

### Performance Optimization

#### Reduce Worktree Creation Time

```bash
# Share virtual environment (if package versions match)
# Don't run pip install in each worktree

# Share node_modules (if package.json matches)
# Use junction/symlink for node_modules

# Create database from template (faster than migrations)
psql -U postgres -c "CREATE DATABASE admin3_feature WITH TEMPLATE admin3_dev;"
```

#### Optimize Database Connections

```bash
# In .env.local, limit connection pool
CONN_MAX_AGE=600
DB_CONN_MAX_AGE=600

# Reduce number of concurrent connections
# PostgreSQL max_connections setting
```

### Debugging Tips

#### Check Worktree Status

```bash
# List all worktrees with details
git worktree list --porcelain

# Verify which branch is checked out where
git worktree list

# Check for broken worktree links
git worktree prune --dry-run
```

#### Database Debugging

```bash
# List all admin3 databases with sizes
psql -U postgres -c "
SELECT
    datname as database,
    pg_size_pretty(pg_database_size(datname)) as size,
    (SELECT count(*) FROM pg_stat_activity WHERE datname = pg_database.datname) as connections
FROM pg_database
WHERE datname LIKE 'admin3_%';"

# Check active connections to specific database
psql -U postgres -c "
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = 'admin3_feature';"

# Force disconnect all users from database
psql -U postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'admin3_feature' AND pid <> pg_backend_pid();"
```

#### Environment Verification

```bash
# Verify environment variables are correct
cd C:\Code\Admin3-feature\backend\django_Admin3
.\.venv\Scripts\activate

# Print Django database settings
python manage.py shell
>>> from django.conf import settings
>>> print(settings.DATABASES)
>>> exit()

# Test database connection
python manage.py dbshell
\conninfo
\q
```

## Quick Reference

### Essential Commands

```bash
# Create worktree
git worktree add <path> <branch>

# List worktrees
git worktree list

# Remove worktree
git worktree remove <path>

# Cleanup deleted worktrees
git worktree prune

# Create database
psql -U postgres -c "CREATE DATABASE <dbname>;"

# Drop database
psql -U postgres -c "DROP DATABASE <dbname>;"

# Run migrations
python manage.py migrate

# Start server on custom port
python manage.py runserver <port>
```

### Worktree Lifecycle Cheat Sheet

```bash
# 1. CREATE
git worktree add ..\Admin3-feature feature-branch
psql -U postgres -c "CREATE DATABASE admin3_feature;"

# 2. CONFIGURE
cd ..\Admin3-feature
# Edit .env.local: update DB_NAME, ports

# 3. SETUP
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate

# 4. DEVELOP
python manage.py runserver 8889
# ... do your work ...

# 5. CLEANUP
cd C:\Code\Admin3
git worktree remove ..\Admin3-feature
psql -U postgres -c "DROP DATABASE admin3_feature;"
```

## Summary

Git worktree with PostgreSQL database isolation provides:

1. **Parallel Development**: Work on multiple features simultaneously
2. **Database Safety**: Complete data isolation prevents conflicts
3. **Testing Flexibility**: Test migrations and features independently
4. **Quick Context Switching**: No need to stash or commit incomplete work
5. **Code Review Efficiency**: Test PRs without disrupting current work

**Key Takeaways:**
- Always use separate databases for each worktree
- Automate worktree creation with scripts for consistency
- Follow naming conventions for worktrees and databases
- Clean up regularly to manage disk space
- Document port assignments to avoid conflicts
- Test migrations in feature worktree before merging to main

**Remember**: Worktrees share the git repository but should have isolated runtime environments (databases, virtual environments, ports) for safe parallel development.