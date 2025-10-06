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

### Backend Port
Add or update in `backend/django_Admin3/.env.development`:
```env
PORT=8889
```

### Frontend Port
Add or update in `frontend/react-Admin3/.env`:
```env
PORT=3001
```

## Worktree Support

Each git worktree can have its own port configuration in its `.env` files. The script automatically reads the local `.env` files, so different worktrees can run on different ports simultaneously.

### Example: Multiple Worktrees

**Main worktree** (`Admin3`):
- Backend: `PORT=8888`
- Frontend: `PORT=3000`

**Feature worktree** (`Admin3-003-vat-calculation-rules-engine`):
- Backend: `PORT=8889`
- Frontend: `PORT=3001`

Run `start-servers.ps1` (or `.sh`) in each worktree directory to start servers on their respective ports.

## Virtual Environment Detection

The scripts automatically detect the Python virtual environment using the same logic as `create-worktree.ps1`:

1. **Local venv**: First checks for `.venv/` in the current worktree directory
2. **Main venv**: If not found, checks for `.venv/` in the main `Admin3` worktree
3. **Error**: Exits with error if neither is found

### Example Scenarios

**Scenario 1: Main Worktree**
```
C:\Code\Admin3\.venv\     ← Uses this
```

**Scenario 2: Worktree with Own Venv**
```
C:\Code\Admin3\.venv\
C:\Code\Admin3-feature\.venv\     ← Uses this (local venv)
```

**Scenario 3: Worktree Sharing Main Venv**
```
C:\Code\Admin3\.venv\              ← Uses this (main venv)
C:\Code\Admin3-feature\            (no local venv)
```

This allows worktrees to either:
- Have their own independent virtual environment
- Share the main worktree's virtual environment (saves disk space)

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
