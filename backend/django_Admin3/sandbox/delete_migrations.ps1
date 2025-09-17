# Remove all migration files except __init__.py in the current directory and subdirectories
Get-ChildItem -Path . -Recurse -Include "migrations" -Directory | ForEach-Object {
    Get-ChildItem -Path $_.FullName -File | Where-Object { $_.Name -ne "__init__.py" } | Remove-Item -Force
}