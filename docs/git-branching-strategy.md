# Git Branching Strategy & Conventions

## Branch Hierarchy

```
feature branches → PR → main → fast-forward to staging → fast-forward to uat
```

| Branch | Purpose | Who pushes | CI Trigger |
|--------|---------|-----------|------------|
| `main` | Source of truth, production-ready | PRs only (merge) | deploy.yml (tests + deploy) |
| `staging` | Staging server (Windows Docker) | Admin only (ff merge from main) | deploy-staging.yml |
| `uat` | User acceptance testing | Admin only (ff merge from main) | deploy.yml on uat push |

**Rules:**
- All feature work branches off `main` and merges back via PR
- `staging` and `uat` are promotion targets — never commit directly to them
- Environment branches receive fast-forward merges only (no merge commits)

## Branch Naming Convention

**Pattern:** `{type}/{YYYYMMDD}-{short-description}`

| Type | Use |
|------|-----|
| `feat/` | New feature or enhancement |
| `fix/` | Bug fix |
| `refactor/` | Code restructuring without behavior change |
| `chore/` | Build, CI, deps, docs, tooling |

**Rules:**
- Always lowercase, always kebab-case (hyphens only)
- Date is the branch creation date
- Description is 3-5 words max
- No spaces, no special characters beyond hyphens

**Examples:**
```
feat/20260317-tutorial-admin-panel
fix/20260317-cart-quantity-validation
refactor/20260317-store-typescript-migration
chore/20260317-vite-migration
```

**Enforcement:** CI required status check (`branch-name-check.yml`) blocks PRs with non-conforming names.

## Daily Workflow

### Creating a feature branch
```bash
git checkout main
git pull origin main
git checkout -b feat/20260317-my-feature
```

### Opening a PR
- PRs must target `main` (enforced by CI)
- Branch name must follow convention (enforced by CI)
- Tests must pass before merge

### Promoting to environments
```bash
# Promote main → staging
git checkout staging && git merge --ff-only main && git push origin staging

# Promote main → uat
git checkout uat && git merge --ff-only main && git push origin uat

# Return to main
git checkout main
```

If `--ff-only` fails, it means the environment branch has diverged. Reset it:
```bash
git checkout staging && git reset --hard main && git push --force origin staging
```

## Useful Git Aliases

These are installed in `~/.gitconfig`:

| Alias | Command | Purpose |
|-------|---------|---------|
| `git recent` | `branch --sort=-committerdate` | List branches by most recent commit |
| `git active` | `branch --no-merged main` | List branches with unmerged work |
| `git stale` | `branch --merged main` | List branches safe to delete |
| `git prune-merged` | Delete merged branches | Clean up after merging |
| `git sync` | `fetch --prune` | Fetch and clean stale remote refs |

## Periodic Maintenance

After merging PRs:
```bash
git sync                 # Fetch + prune stale remote refs
git prune-merged         # Delete local merged branches
```

## Dev-only Files

Dev tooling directories (`.claude/`, `.bmad-core/`, `.codex/`, `docs/`, `specs/`, etc.) are tracked in git for developer collaboration but excluded from deployments via `.dockerignore`.

## GitHub Settings

### Required (configured via GitHub UI)
- **Auto-delete head branches**: Settings → General → Pull Requests → check "Automatically delete head branches"
- **Branch protection ruleset**: Settings → Rules → Rulesets (see setup instructions below)

### Ruleset: "Protected Branches"

**Target:** `main`, `staging`, `uat` (use "Include by pattern" with patterns `main`, `staging`, `uat`)

**Rules for all three:**
- Block force pushes
- Block deletions

**Additional rules for `main`:**
- Require pull request before merging
- Require status checks to pass: `check-branch-name`, `test-backend`, `test-frontend`

**Additional rules for `staging`/`uat`:**
- Require pull request before merging (prevents accidental direct pushes)
- Bypass list: add yourself as bypass actor (so you can do ff-merge promotions)
