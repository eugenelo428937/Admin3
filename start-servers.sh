#!/bin/bash
# Start both Django and React servers in separate terminals
# Cross-platform script for Mac/Linux

echo -e "\033[0;32mStarting Django and React servers...\033[0m"

# Read backend port from .env.development
BACKEND_ENV_PATH="backend/django_Admin3/.env.development"
BACKEND_PORT=8888  # Default port

if [ -f "$BACKEND_ENV_PATH" ]; then
    if grep -q "^BACKEND_PORT=" "$BACKEND_ENV_PATH"; then
        BACKEND_PORT=$(grep "^BACKEND_PORT=" "$BACKEND_ENV_PATH" | cut -d '=' -f2 | tr -d '\r\n ')
        echo -e "\033[0;36mBackend port from .env: $BACKEND_PORT\033[0m"
    else
        echo -e "\033[0;33mBACKEND_PORT not found in .env, using default: $BACKEND_PORT\033[0m"
    fi
else
    echo -e "\033[0;33mBackend .env not found, using default port: $BACKEND_PORT\033[0m"
fi

# Read frontend port from backend .env.development (FRONTEND_PORT)
FRONTEND_PORT=3000  # Default port

if [ -f "$BACKEND_ENV_PATH" ]; then
    if grep -q "^FRONTEND_PORT=" "$BACKEND_ENV_PATH"; then
        FRONTEND_PORT=$(grep "^FRONTEND_PORT=" "$BACKEND_ENV_PATH" | cut -d '=' -f2 | tr -d '\r\n ')
        echo -e "\033[0;36mFrontend port from .env: $FRONTEND_PORT\033[0m"
    else
        echo -e "\033[0;33mFRONTEND_PORT not found in .env, using default: $FRONTEND_PORT\033[0m"
    fi
else
    echo -e "\033[0;33mBackend .env not found, using default frontend port: $FRONTEND_PORT\033[0m"
fi

# Get current directory
CURRENT_DIR=$(pwd)

# Find Python virtual environment (same logic as create-worktree.ps1)
LOCAL_VENV="$CURRENT_DIR/.venv/bin/activate"
PARENT_DIR=$(dirname "$CURRENT_DIR")
MAIN_WORKTREE="$PARENT_DIR/Admin3"
MAIN_VENV="$MAIN_WORKTREE/.venv/bin/activate"

if [ -f "$LOCAL_VENV" ]; then
    VENV_PATH="$LOCAL_VENV"
    VENV_TYPE="local"
    echo -e "\033[0;36mUsing local venv: $VENV_PATH\033[0m"
elif [ -f "$MAIN_VENV" ]; then
    VENV_PATH="$MAIN_VENV"
    VENV_TYPE="main"
    echo -e "\033[0;36mUsing main worktree venv: $VENV_PATH\033[0m"
else
    echo -e "\033[0;31m⚠ No Python virtual environment found.\033[0m"
    echo -e "\033[0;37m  Tried: $LOCAL_VENV\033[0m"
    echo -e "\033[0;37m  Tried: $MAIN_VENV\033[0m"
    echo -e "\033[0;33m  Please create a virtual environment or run from the correct directory.\033[0m"
    exit 1
fi

# Find node_modules (similar logic for frontend)
LOCAL_NODE_MODULES="$CURRENT_DIR/frontend/react-Admin3/node_modules"
MAIN_NODE_MODULES="$MAIN_WORKTREE/frontend/react-Admin3/node_modules"

if [ -d "$LOCAL_NODE_MODULES" ]; then
    FRONTEND_DIR="$CURRENT_DIR/frontend/react-Admin3"
    NODE_MODULES_TYPE="local"
    echo -e "\033[0;36mUsing local node_modules\033[0m"
elif [ -d "$MAIN_NODE_MODULES" ]; then
    FRONTEND_DIR="$MAIN_WORKTREE/frontend/react-Admin3"
    NODE_MODULES_TYPE="main"
    echo -e "\033[0;36mUsing main worktree node_modules\033[0m"
else
    echo -e "\033[0;31m⚠ No node_modules found.\033[0m"
    echo -e "\033[0;37m  Tried: $LOCAL_NODE_MODULES\033[0m"
    echo -e "\033[0;37m  Tried: $MAIN_NODE_MODULES\033[0m"
    echo -e "\033[0;33m  Please run 'npm install' in frontend/react-Admin3 directory.\033[0m"
    exit 1
fi

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo -e "\033[0;36mDetected macOS\033[0m"

    # Start Django server in new Terminal tab
    echo -e "\033[0;32mStarting Django on port $BACKEND_PORT...\033[0m"
    if [ "$VENV_TYPE" = "local" ]; then
        osascript -e "tell application \"Terminal\" to do script \"cd '$CURRENT_DIR/backend/django_Admin3' && cd ../.. && source .venv/bin/activate && cd backend/django_Admin3 && python manage.py runserver $BACKEND_PORT\""
    else
        osascript -e "tell application \"Terminal\" to do script \"cd '$MAIN_WORKTREE' && source .venv/bin/activate && cd '$CURRENT_DIR/backend/django_Admin3' && python manage.py runserver $BACKEND_PORT\""
    fi

    # Start React server in new Terminal tab
    echo -e "\033[0;32mStarting React on port $FRONTEND_PORT...\033[0m"
    osascript -e "tell application \"Terminal\" to do script \"cd '$FRONTEND_DIR' && npm start\""

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo -e "\033[0;36mDetected Linux\033[0m"

    # Try to find available terminal emulator
    TERMINAL=""
    for term in gnome-terminal konsole xterm x-terminal-emulator; do
        if command -v $term &> /dev/null; then
            TERMINAL=$term
            break
        fi
    done

    if [ -z "$TERMINAL" ]; then
        echo -e "\033[0;31mNo suitable terminal emulator found. Please install gnome-terminal, konsole, or xterm.\033[0m"
        exit 1
    fi

    echo -e "\033[0;36mUsing terminal: $TERMINAL\033[0m"

    # Start Django server
    echo -e "\033[0;32mStarting Django on port $BACKEND_PORT...\033[0m"
    if [ "$VENV_TYPE" = "local" ]; then
        DJANGO_CMD="cd '$CURRENT_DIR/backend/django_Admin3'; cd ../..; source .venv/bin/activate; cd backend/django_Admin3; python manage.py runserver $BACKEND_PORT; exec bash"
    else
        DJANGO_CMD="cd '$MAIN_WORKTREE'; source .venv/bin/activate; cd '$CURRENT_DIR/backend/django_Admin3'; python manage.py runserver $BACKEND_PORT; exec bash"
    fi

    if [ "$TERMINAL" = "gnome-terminal" ]; then
        $TERMINAL -- bash -c "$DJANGO_CMD" &
    else
        $TERMINAL -e bash -c "$DJANGO_CMD" &
    fi

    # Start React server
    echo -e "\033[0;32mStarting React on port $FRONTEND_PORT...\033[0m"
    if [ "$TERMINAL" = "gnome-terminal" ]; then
        $TERMINAL -- bash -c "cd '$FRONTEND_DIR'; npm start; exec bash" &
    else
        $TERMINAL -e bash -c "cd '$FRONTEND_DIR'; npm start; exec bash" &
    fi

else
    echo -e "\033[0;31mUnsupported OS: $OSTYPE\033[0m"
    exit 1
fi

echo -e "\n\033[0;33mBoth servers starting in separate windows...\033[0m"
echo -e "\033[0;36mBackend: http://127.0.0.1:$BACKEND_PORT\033[0m"
echo -e "\033[0;36mFrontend: http://127.0.0.1:$FRONTEND_PORT\033[0m"
