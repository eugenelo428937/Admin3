# Admin3 Worktree Scripts

Automated scripts for managing Git worktrees with isolated PostgreSQL databases.

## Prerequisites

Before using these scripts, ensure you have:

- **Git 2.5+** with worktree support
- **PostgreSQL 14+** installed and running
- **Python 3.14+** with Admin3 dependencies
- **Node.js 16+** and npm
- **PowerShell** (Windows) or Bash (Linux/Mac)

## Quick Start

### Create a New Worktree

```powershell
# Basic usage with defaults
.\scripts\create-worktree.ps1 -BranchName "feature/vat-system"

# Custom ports and location
.\scripts\create-worktree.ps1 -BranchName "hotfix/cart-bug" `
                              -WorktreePath "C:\Code\Admin3-hotfix" `
                              -BackendPort 8890 `
                              -FrontendPort 3002
```

### Remove a Worktree

```powershell
# Remove worktree and database
.\scripts\remove-worktree.ps1 -WorktreePath "..\Admin3-feature-vat-system" -DropDatabase
```

### List All Worktrees

```powershell
# Basic list
.\scripts\list-worktrees.ps1

# Detailed view with ports and status
.\scripts\list-worktrees.ps1 -Detailed
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `create-worktree.ps1` | Create new worktree with isolated database and configuration |
| `remove-worktree.ps1` | Safely remove worktree and optionally drop database |
| `list-worktrees.ps1` | List all worktrees with branch, database, and port information |

### Script Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `-BranchName` | Yes | - | Git branch to checkout in worktree |
| `-WorktreePath` | No | `../Admin3-{BranchName}` | Path for worktree directory |
| `-BackendPort` | No | `8889` | Django development server port |
| `-FrontendPort` | No | `3001` | React development server port |
| `-PostgresUser` | No | `actedadmin` | PostgreSQL username |
| `-PostgresPassword` | No | `Act3d@dm1n0EEoo` | PostgreSQL password |

## What the Script Does

The `create-worktree.ps1` script automates the following steps:

1. **Creates Git Worktree**: Checks out the specified branch in a separate directory
2. **Creates PostgreSQL Database**: Creates isolated database with naming convention `admin3_{branch_name}`
3. **Configures Backend**: Copies and updates `.env.development` with new database name and ports
4. **Sets Up Virtual Environment**: Optionally creates new Python venv or reuses main worktree's
5. **Runs Migrations**: Applies Django migrations to the new database
6. **Copies Data**: Optionally copies data from main database for testing
7. **Configures Frontend**: Creates `.env` file with correct API URL and port
8. **Installs Dependencies**: Optionally runs npm install or reuses node_modules

## Interactive Prompts

The script will ask you:

- **Create new virtual environment?** (Y/n) [default: n]
  - `n` = Reuse main worktree's venv (faster, saves disk space)
  - `y` = Create dedicated venv for this worktree (full isolation)

- **Copy data from main database?** (y/N) [default: n]
  - `n` = Start with empty database (migrations only)
  - `y` = Copy data from ACTEDDBDEV01 (useful for testing)

- **Install npm dependencies?** (y/N) [default: n]
  - `n` = Reuse main worktree's node_modules (faster)
  - `y` = Run npm install in worktree (full isolation)

## Examples

### Feature Development Worktree
```powershell
# Create worktree for new feature
.\scripts\create-worktree.ps1 -BranchName "feature/vat-calculation"

# Start backend (terminal 1)
cd ..\Admin3-feature-vat-calculation\backend\django_Admin3
..\..\..\Admin3\backend\django_Admin3\.venv\Scripts\activate
python manage.py runserver 8889

# Start frontend (terminal 2)
cd ..\Admin3-feature-vat-calculation\frontend\react-Admin3
npm start
```

### Hotfix Worktree
```powershell
# Create worktree from main branch for urgent fix
.\scripts\create-worktree.ps1 -BranchName "main" `
                              -WorktreePath "..\Admin3-hotfix" `
                              -BackendPort 8890

# After fixing the issue
cd ..\Admin3-hotfix
git checkout -b hotfix/critical-security-fix
# ... make changes ...
git add . && git commit -m "hotfix: resolve security vulnerability"
git push origin hotfix/critical-security-fix
```

### Code Review Worktree
```powershell
# Create worktree to review a PR
.\scripts\create-worktree.ps1 -BranchName "origin/feature/new-checkout" `
                              -WorktreePath "..\Admin3-review-pr-123" `
                              -BackendPort 8891 `
                              -FrontendPort 3003

# Test the PR
cd ..\Admin3-review-pr-123\backend\django_Admin3
python manage.py test
python manage.py runserver 8891
```

## Port Assignments

To avoid conflicts, use these port conventions:

| Worktree Type | Backend Port | Frontend Port | Database |
|---------------|--------------|---------------|----------|
| Main (Admin3) | 8888 | 3000 | ACTEDDBDEV01 |
| Feature 1 | 8889 | 3001 | admin3_feature_name |
| Hotfix | 8890 | 3002 | admin3_hotfix |
| Review/Test | 8891 | 3003 | admin3_review_pr_123 |

## Troubleshooting

### PowerShell Execution Policy Error
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Branch Already Checked Out
```
Error: branch 'feature-branch' is already checked out
```
**Solution**: You cannot checkout the same branch in multiple worktrees. Create a new branch or use a different existing branch.

### Database Already Exists
```
ERROR: database "admin3_feature_name" already exists
```
**Solution**: Either:
- Drop the existing database: `psql -U actedadmin -c "DROP DATABASE admin3_feature_name;"`
- Use the existing database and skip creation

### Port Already in Use
```
Error: That port is already in use.
```
**Solution**: Use different ports with `-BackendPort` and `-FrontendPort` parameters.

### psql Not Found
```
psql not found. Please ensure PostgreSQL is installed.
```
**Solution**: Install PostgreSQL or add it to your PATH environment variable.

## Cleanup

### Remove a Worktree (Automated)

Use the `remove-worktree.ps1` script for safe cleanup:

```powershell
# Remove worktree only (preserve database)
.\scripts\remove-worktree.ps1 -WorktreePath "..\Admin3-feature-vat-system"

# Remove worktree and drop database
.\scripts\remove-worktree.ps1 -WorktreePath "..\Admin3-feature-vat-system" -DropDatabase

# Force removal (even with uncommitted changes)
.\scripts\remove-worktree.ps1 -WorktreePath "..\Admin3-feature-vat-system" -DropDatabase -Force
```

#### Remove Script Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `-WorktreePath` | Yes | Path to worktree to remove |
| `-DropDatabase` | No | Also drop the associated database |
| `-PostgresUser` | No | PostgreSQL username (default: actedadmin) |
| `-Force` | No | Skip confirmation and remove with uncommitted changes |

### Manual Removal

If you prefer manual cleanup:

```powershell
# Navigate to main worktree
cd C:\Code\Admin3

# Remove worktree
git worktree remove ..\Admin3-feature-vat-system

# Drop database
psql -U actedadmin -c "DROP DATABASE admin3_feature_vat_system;"
```

### List All Worktrees

Use the script for formatted output:
```powershell
# Basic list
.\scripts\list-worktrees.ps1

# Detailed view with ports, databases, and status
.\scripts\list-worktrees.ps1 -Detailed
```

Or use git directly:
```powershell
git worktree list
```

### Prune Deleted Worktrees
```powershell
git worktree prune
```

## Best Practices

1. **Naming Convention**: Use descriptive worktree names matching branch names
   - `Admin3-feature-{feature-name}`
   - `Admin3-hotfix-{issue}`
   - `Admin3-review-pr-{number}`

2. **Database Naming**: Databases auto-named as `admin3_{branch_name_with_underscores}`

3. **Virtual Environments**:
   - Reuse main venv for speed (most cases)
   - Create new venv for different package versions

4. **Port Management**: Increment ports for each worktree to avoid conflicts

5. **Regular Cleanup**: Remove worktrees and databases when done to save disk space

6. **Data Isolation**: Each worktree has its own database to prevent migration conflicts

## Advanced Usage

### Create Worktree Without Script
If you prefer manual setup or need different configuration:

```powershell
# Create worktree
git worktree add ..\Admin3-custom feature-branch

# Create database
psql -U actedadmin -c "CREATE DATABASE admin3_custom;"

# Copy and modify .env files manually
# Run migrations manually
```

### Share Virtual Environment
```powershell
# In worktree, use absolute path to main venv
C:\Code\Admin3\backend\django_Admin3\.venv\Scripts\activate
```

### Database Template
```powershell
# Create database from template (faster than migrations)
psql -U actedadmin -c "CREATE DATABASE admin3_new WITH TEMPLATE admin3_template;"
```

## Related Documentation

- [Git Worktree PostgreSQL Setup Guide](../docs/project_doc/development_environment_setup/Git_Worktree_PostgreSQL_Setup.md)
- [Admin3 Development Setup](../docs/project_doc/development_environment_setup/)
- [PostgreSQL Database Management](../docs/project_doc/database/)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the full [Git Worktree PostgreSQL Setup Guide](../docs/project_doc/development_environment_setup/Git_Worktree_PostgreSQL_Setup.md)
3. Contact the development team
