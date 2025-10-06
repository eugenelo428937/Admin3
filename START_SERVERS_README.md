# Start Servers Scripts

These scripts automatically start both Django backend and React frontend servers in separate terminal windows, reading port configurations from the `.env` files.

## Usage

### Windows
```powershell
.\start-servers.ps1
```

### Mac/Linux
```bash
# First time: make the script executable
chmod +x start-servers.sh

# Run the script
./start-servers.sh
```

## Features

- **Auto-detect ports** from environment files:
  - Backend: `backend/django_Admin3/.env.development` → `PORT` variable
  - Frontend: `frontend/react-Admin3/.env` → `PORT` variable

- **Cross-platform support**:
  - Windows: Opens new PowerShell windows
  - macOS: Opens new Terminal tabs
  - Linux: Uses gnome-terminal, konsole, xterm, or x-terminal-emulator

- **Fallback defaults**:
  - Backend: Port 8888
  - Frontend: Port 3000

## Port Configuration

Both backend and frontend ports are configured in a single file: `backend/django_Admin3/.env.development`

### Backend Port
Add or update in `backend/django_Admin3/.env.development`:
```env
BACKEND_PORT=8889
```

### Frontend Port
Add or update in `backend/django_Admin3/.env.development`:
```env
FRONTEND_PORT=3001
```

**Note:** Both ports are in the same file to keep configuration centralized. Django's `settings/base.py` automatically builds `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` from these port values.

## Worktree Support

Each git worktree can have its own port configuration in its `.env` files. The script automatically reads the local `.env` files, so different worktrees can run on different ports simultaneously.

### Example: Multiple Worktrees

**Main worktree** (`Admin3`):
```env
# backend/django_Admin3/.env.development
BACKEND_PORT=8888
FRONTEND_PORT=3000
```

**Feature worktree** (`Admin3-003-vat-calculation-rules-engine`):
```env
# backend/django_Admin3/.env.development
BACKEND_PORT=8889
FRONTEND_PORT=3001
```

Run `start-servers.ps1` (or `.sh`) in each worktree directory to start servers on their respective ports.

## Virtual Environment and Node Modules Detection

The scripts automatically detect both Python virtual environment and Node.js modules using smart fallback logic:

### Python Virtual Environment Detection

1. **Local venv**: First checks for `.venv/` in the current worktree directory
2. **Main venv**: If not found, checks for `.venv/` in the main `Admin3` worktree
3. **Error**: Exits with error if neither is found

### Node Modules Detection

1. **Local node_modules**: First checks for `frontend/react-Admin3/node_modules/` in current worktree
2. **Main node_modules**: If not found, uses main `Admin3` worktree's `node_modules/`
3. **Error**: Exits with error if neither is found

### Example Scenarios

**Scenario 1: Main Worktree**
```
C:\Code\Admin3\
  ├── .venv\                                    ← Python venv
  └── frontend\react-Admin3\node_modules\       ← Node modules
```

**Scenario 2: Worktree with Own Dependencies**
```
C:\Code\Admin3\
  ├── .venv\
  └── frontend\react-Admin3\node_modules\

C:\Code\Admin3-feature\
  ├── .venv\                                    ← Uses this (local)
  └── frontend\react-Admin3\node_modules\       ← Uses this (local)
```

**Scenario 3: Worktree Sharing Dependencies (Recommended)**
```
C:\Code\Admin3\
  ├── .venv\                                    ← Uses this (main)
  ├── frontend\react-Admin3\node_modules\       ← Uses this (main)
  └── backend\django_Admin3\.env.development    (BACKEND_PORT=8888, FRONTEND_PORT=3000)

C:\Code\Admin3-feature\
  └── backend\django_Admin3\.env.development    (BACKEND_PORT=8889, FRONTEND_PORT=3001)
```

This allows worktrees to either:
- Have their own independent dependencies (for different package versions)
- Share the main worktree's dependencies (saves disk space and installation time)

## Requirements

### Windows
- PowerShell 5.1 or higher
- Python virtual environment (local or main worktree)
- Node.js and npm

### macOS
- Terminal.app (built-in)
- Python virtual environment (local or main worktree)
- Node.js and npm

### Linux
- One of: gnome-terminal, konsole, xterm, or x-terminal-emulator
- Python virtual environment (local or main worktree)
- Node.js and npm

## Troubleshooting

### Port Already in Use
If a port is already in use, change the `PORT` value in the respective `.env` file.

### Virtual Environment Not Found
The script will show an error like:
```
⚠ No Python virtual environment found.
  Tried: C:\Code\Admin3-feature\.venv\Scripts\activate.ps1
  Tried: C:\Code\Admin3\.venv\Scripts\activate.ps1
```

**Solutions:**

**Option 1: Create local venv in worktree**
```bash
cd C:\Code\Admin3-feature
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\django_Admin3\requirements.txt
```

**Option 2: Use main worktree's venv** (recommended for saving disk space)
```bash
# Ensure main worktree has venv
cd C:\Code\Admin3
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\django_Admin3\requirements.txt

# Then run start-servers from your feature worktree
cd C:\Code\Admin3-feature
.\start-servers.ps1  # Will automatically use main venv
```

### Node Modules Not Found (react-scripts error)

The script will show an error like:
```
⚠ No node_modules found.
  Tried: C:\Code\Admin3-feature\frontend\react-Admin3\node_modules
  Tried: C:\Code\Admin3\frontend\react-Admin3\node_modules
```

Or you might see:
```
'react-scripts' is not recognized as an internal or external command
```

**Solutions:**

**Option 1: Create local node_modules in worktree**
```bash
cd C:\Code\Admin3-feature\frontend\react-Admin3
npm install
```

**Option 2: Use main worktree's node_modules** (recommended for saving disk space)
```bash
# Ensure main worktree has node_modules
cd C:\Code\Admin3\frontend\react-Admin3
npm install

# Then run start-servers from your feature worktree
cd C:\Code\Admin3-feature
.\start-servers.ps1  # Will automatically use main node_modules
```

### Terminal Not Opening (Linux)
Install a supported terminal emulator:
```bash
# Ubuntu/Debian
sudo apt install gnome-terminal

# Fedora
sudo dnf install gnome-terminal

# Arch
sudo pacman -S gnome-terminal
```
