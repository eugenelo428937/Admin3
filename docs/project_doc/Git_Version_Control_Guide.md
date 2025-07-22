# Git Version Control Guide for Admin3 Project

## Table of Contents
1. [Overview](#overview)
2. [Branch Structure](#branch-structure)
3. [Basic Git Workflow](#basic-git-workflow)
4. [Merging Changes Between Branches](#merging-changes-between-branches)
5. [Pull Request Workflow](#pull-request-workflow)
6. [Best Practices](#best-practices)
7. [Common Commands](#common-commands)
8. [Troubleshooting](#troubleshooting)

## Overview

This guide provides step-by-step instructions for using Git version control in the Admin3 project, covering how to merge changes between different environments (development, staging, UAT, and production).

## Branch Structure

### Standard Branch Hierarchy
```
main (production) ← uat ← staging ← feature branches
```

- **main**: Production branch - always stable, deployable code
- **uat**: User Acceptance Testing branch - tested features ready for UAT
- **staging**: Testing branch - integrated features for QA testing
- **feature branches**: Individual feature development (e.g., `feature/user-auth`, `bugfix/cart-issue`)

## Basic Git Workflow

### 1. Starting New Work

```bash
# Switch to main branch and pull latest changes
git checkout main
git pull origin main

# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/issue-description
```

### 2. Making Changes

```bash
# Check status of your changes
git status

# Stage specific files
git add path/to/file.py
git add path/to/another/file.js

# Or stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: add user authentication system

- Implement JWT token authentication
- Add login/logout endpoints
- Update user model with new fields"
```

### 3. Pushing Changes

```bash
# Push feature branch to remote
git push origin feature/your-feature-name

# If first time pushing this branch
git push -u origin feature/your-feature-name
```

## Merging Changes Between Branches

### Method 1: Direct Merge (Simple Projects)

#### Step 1: Merge Feature to Staging
```bash
# Switch to staging branch
git checkout staging
git pull origin staging

# Merge your feature branch
git merge feature/your-feature-name

# Push updated staging
git push origin staging
```

#### Step 2: Merge Staging to UAT
```bash
# Switch to UAT branch
git checkout uat
git pull origin uat

# Merge staging branch
git merge staging

# Push updated UAT
git push origin uat
```

#### Step 3: Merge UAT to Production (Main)
```bash
# Switch to main branch
git checkout main
git pull origin main

# Merge UAT branch
git merge uat

# Tag the release (optional but recommended)
git tag -a v1.2.3 -m "Release version 1.2.3"
git push origin v1.2.3

# Push updated main
git push origin main
```

### Method 2: Pull Request Workflow (Recommended)

#### Step 1: Create Pull Request for Feature → Staging
1. Push your feature branch to remote
2. Go to your Git hosting platform (GitHub/GitLab/Bitbucket)
3. Create pull request: `feature/your-feature-name` → `staging`
4. Add description, reviewers, and labels
5. Wait for review and approval
6. Merge pull request

#### Step 2: Create Pull Request for Staging → UAT
```bash
# After staging is updated, create PR: staging → uat
```
1. Create pull request: `staging` → `uat`
2. Include release notes and testing instructions
3. Get approval from UAT team
4. Merge pull request

#### Step 3: Create Pull Request for UAT → Production
```bash
# After UAT approval, create PR: uat → main
```
1. Create pull request: `uat` → `main`
2. Include comprehensive release notes
3. Get approval from technical lead/manager
4. Schedule deployment window
5. Merge pull request

## Pull Request Workflow

### When to Use Pull Requests

**Always use Pull Requests for:**
- Merging feature branches to staging
- Merging between environment branches (staging → uat → main)
- Any changes that affect production code
- Code reviews and collaboration

**Direct merges might be acceptable for:**
- Personal development branches
- Hotfixes in emergency situations (with immediate review)

### Pull Request Best Practices

#### 1. Creating a Good Pull Request
```markdown
## Title
feat: implement user dashboard with analytics

## Description
This PR adds a comprehensive user dashboard that displays:
- User activity metrics
- Recent orders
- Account settings quick access

## Changes Made
- Added Dashboard component with Material-UI layout
- Implemented analytics API endpoints
- Updated user model with last_login tracking
- Added dashboard routing and navigation

## Testing
- [ ] Unit tests pass
- [ ] Integration tests added
- [ ] Manual testing completed
- [ ] Cross-browser testing done

## Deployment Notes
- Requires database migration
- New environment variables needed (see .env.example)
```

#### 2. Review Process
1. **Self Review**: Review your own code before requesting others
2. **Assign Reviewers**: Add appropriate team members
3. **Address Feedback**: Respond to all comments and make requested changes
4. **Update Tests**: Ensure all tests pass
5. **Squash Commits**: Clean up commit history if needed

## Best Practices

### Commit Message Format
```
type(scope): brief description

Detailed explanation of changes made
- Bullet points for major changes
- Reference issue numbers if applicable

Closes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Branch Naming Conventions
```
feature/short-description
bugfix/issue-number-description
hotfix/critical-issue-fix
release/version-number
```

### Environment-Specific Practices

#### Development Branch Management
```bash
# Keep feature branches up to date
git checkout feature/your-feature
git rebase staging  # or git merge staging

# Clean up after merge
git branch -d feature/your-feature
git push origin --delete feature/your-feature
```

#### Staging Environment
- Always test thoroughly before promoting to UAT
- Run full test suite: `npm test` and `python manage.py test`
- Verify database migrations work correctly
- Test email functionality in development mode

#### UAT Environment
- Deploy only stable, tested features
- Coordinate with UAT team for testing schedules
- Document any configuration changes needed
- Prepare rollback plan

#### Production Environment
- **Never** commit directly to main branch
- Always use pull requests with multiple approvals
- Tag all production releases
- Schedule deployments during maintenance windows
- Have rollback procedures ready

## Common Commands

### Daily Development
```bash
# Check current status
git status
git branch -a

# Update local branch with remote changes
git pull origin branch-name

# Switch branches
git checkout branch-name

# Create and switch to new branch
git checkout -b new-branch-name

# Stage and commit changes
git add .
git commit -m "descriptive message"

# Push changes
git push origin branch-name
```

### Branch Management
```bash
# List all branches
git branch -a

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name

# Rename current branch
git branch -m new-branch-name
```

### Merging and Rebasing
```bash
# Merge another branch into current
git merge other-branch

# Rebase current branch onto another
git rebase other-branch

# Interactive rebase for cleaning commits
git rebase -i HEAD~3
```

## Troubleshooting

### Common Issues and Solutions

#### Merge Conflicts
```bash
# When conflicts occur during merge
git status  # See conflicted files
# Edit files to resolve conflicts
git add resolved-file.py
git commit -m "resolve merge conflicts"
```

#### Accidental Commits
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Amend last commit message
git commit --amend -m "corrected message"
```

#### Sync Fork with Upstream
```bash
# Add upstream remote
git remote add upstream https://github.com/original-repo.git

# Fetch upstream changes
git fetch upstream

# Merge upstream main into your main
git checkout main
git merge upstream/main
```

#### Emergency Hotfix Process
```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# Make minimal fix
# ... make changes ...
git add .
git commit -m "hotfix: resolve critical security issue"

# Push and create urgent PR
git push origin hotfix/critical-issue
# Create PR: hotfix/critical-issue → main
# Get immediate review and merge

# Merge hotfix back to other branches
git checkout uat
git merge main
git push origin uat

git checkout staging
git merge main
git push origin staging
```

### Git Configuration

#### Initial Setup
```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Set default editor
git config --global core.editor "code --wait"

# Set default branch name
git config --global init.defaultBranch main
```

#### Project-Specific Settings
```bash
# In Admin3 project directory
cd C:\Code\Admin3

# Set project-specific email if needed
git config user.email "your.work.email@company.com"

# Configure line endings for Windows
git config core.autocrlf true
```

## Summary

This Git workflow ensures:
1. **Code Quality**: All changes reviewed before production
2. **Environment Stability**: Proper testing at each stage
3. **Traceability**: Clear history of what was deployed when
4. **Rollback Capability**: Easy to revert if issues occur
5. **Team Collaboration**: Structured process for multiple developers

Remember: When in doubt, create a pull request. It's better to have an extra review than to break production!