@echo off
echo Clearing ESLint cache...
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo Cache cleared successfully!
) else (
    echo No cache directory found
)
if exist ".eslintcache" (
    del /f /q ".eslintcache"
    echo Deleted .eslintcache file
)
echo.
echo Done! Please restart your IDE.
pause