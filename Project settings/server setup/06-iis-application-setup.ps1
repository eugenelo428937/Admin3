# Admin3 IIS and Application Deployment Script
# Enhanced IIS Setup and Application Deployment

# Install IIS features
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole,IIS-WebServer,IIS-CommonHttpFeatures,IIS-HttpRedirect,IIS-WebServerManagementTools,IIS-HttpCompressionStatic,IIS-HttpCompressionDynamic,IIS-Security,IIS-RequestFiltering,IIS-HttpLogging,IIS-DefaultDocument,IIS-DirectoryBrowsing,IIS-ASPNET45

# Download and install URL Rewrite module
$urlRewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
$urlRewriteFile = "C:\temp\rewrite_amd64.msi"
New-Item -ItemType Directory -Path "C:\temp" -Force
Invoke-WebRequest -Uri $urlRewriteUrl -OutFile $urlRewriteFile
Start-Process -FilePath $urlRewriteFile -ArgumentList "/quiet" -Wait

# Download and install ARR
$arrUrl = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi"
$arrFile = "C:\temp\requestRouter_amd64.msi"
Invoke-WebRequest -Uri $arrUrl -OutFile $arrFile
Start-Process -FilePath $arrFile -ArgumentList "/quiet" -Wait

# Import IIS module
Import-Module WebAdministration

# Remove default site
Remove-WebSite -Name "Default Web Site"

# Create new site
New-WebSite -Name "Admin3" -Port 80 -PhysicalPath "C:\inetpub\wwwroot\Admin3\static"

# Configure application pool
New-WebAppPool -Name "Admin3AppPool"
Set-ItemProperty -Path "IIS:\AppPools\Admin3AppPool" -Name "processModel.identityType" -Value "ApplicationPoolIdentity"
Set-ItemProperty -Path "IIS:\AppPools\Admin3AppPool" -Name "processModel.idleTimeout" -Value "00:00:00"
Set-ItemProperty -Path "IIS:\AppPools\Admin3AppPool" -Name "recycling.periodicRestart.time" -Value "00:00:00"
Set-WebConfiguration -Filter "/system.webServer/httpCompression" -Location "Admin3" -Value @{dynamicCompressionDisableCpuUsage=100;dynamicCompressionEnableCpuUsage=50}

# Application Deployment
function Deploy-Application {
    Write-Host "Deploying Admin3 application..." -ForegroundColor Cyan
    
    $appPath = "C:\inetpub\wwwroot\Admin3"
    $backendPath = Join-Path $appPath "backend"
    $frontendPath = Join-Path $appPath "frontend"
    
    # Create application directories
    if (-not (Test-Path $appPath)) {
        New-Item -ItemType Directory -Path $appPath -Force
    }
    
    # Setup Django backend
    Write-Host "Setting up Django backend..." -ForegroundColor Yellow
    
    # Navigate to project directory
    cd $appPath
    
    # Create virtual environment
    python -m venv .venv
    .\\.venv\\Scripts\\activate
    
    # Upgrade pip and install dependencies
    python -m pip install --upgrade pip
    pip install -r backend\\django_Admin3\\requirements.txt
    pip install waitress gunicorn psycopg2-binary redis django-redis
    pip install sentry-sdk # For error tracking
    
    # Create logs directory
    New-Item -ItemType Directory -Path "C:\logs\admin3" -Force
    
    # Apply migrations
    cd backend\django_Admin3
    python manage.py migrate
    
    # Collect static files
    python manage.py collectstatic --noinput
    
    # Test Django application
    python manage.py check --deploy
    
    Write-Host "Django backend setup completed" -ForegroundColor Green
    
    # React Production Build
    Write-Host "Building React application..." -ForegroundColor Yellow
    cd $appPath\frontend\react-Admin3
    
    # Install dependencies
    npm install
    
    # Build for production
    npm run build
    
    # Copy build files to IIS directory
    Copy-Item -Path "build\*" -Destination "C:\inetpub\wwwroot\Admin3\static" -Recurse -Force
    
    Write-Host "React application build completed" -ForegroundColor Green
}

# Create Waitress WSGI Server script
$waitressScript = @'
# backend/django_Admin3/waitress_server.py
import os
import logging
from waitress import serve
from django_Admin3.wsgi import application

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('C:\\logs\\admin3\\waitress.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

if __name__ == '__main__':
    logger.info("Starting Waitress WSGI server...")
    
    # Production configuration
    serve(
        application,
        host='127.0.0.1',
        port=8000,
        threads=10,
        max_request_body_size=10485760,  # 10MB
        connection_limit=1000,
        cleanup_interval=30,
        channel_timeout=120,
        log_socket_errors=True,
        ident='Admin3-Waitress'
    )
'@

$waitressScript | Out-File -FilePath "C:\inetpub\wwwroot\Admin3\backend\django_Admin3\waitress_server.py" -Encoding UTF8

# Install Waitress as Windows service using NSSM
function Install-WaitressService {
    $serviceName = "Admin3-Waitress"
    $pythonExe = "C:\inetpub\wwwroot\Admin3\.venv\Scripts\python.exe"
    $serverScript = "C:\inetpub\wwwroot\Admin3\backend\django_Admin3\waitress_server.py"
    
    nssm install $serviceName $pythonExe $serverScript
    nssm set $serviceName AppDirectory "C:\inetpub\wwwroot\Admin3\backend\django_Admin3"
    nssm set $serviceName DisplayName "Admin3 Waitress WSGI Server"
    nssm set $serviceName Description "Production WSGI server for Admin3 Django application"
    nssm set $serviceName Start SERVICE_AUTO_START
    nssm set $serviceName AppStdout "C:\logs\admin3\waitress-stdout.log"
    nssm set $serviceName AppStderr "C:\logs\admin3\waitress-stderr.log"
    nssm set $serviceName AppRotateFiles 1
    nssm set $serviceName AppRotateOnline 1
    nssm set $serviceName AppRotateBytes 10485760  # 10MB
    
    # Start the service
    Start-Service $serviceName
    
    Write-Host "Waitress service installed and started successfully" -ForegroundColor Green
}

# Create web.config for URL rewriting
$webConfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- API Proxy Rule -->
                <rule name="Django API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:8000/api/{R:1}" appendQueryString="true" />
                </rule>
                
                <!-- Admin Panel Proxy -->
                <rule name="Django Admin Proxy" stopProcessing="true">
                    <match url="^admin/(.*)" />
                    <action type="Rewrite" url="http://localhost:8000/admin/{R:1}" appendQueryString="true" />
                </rule>
                
                <!-- React Router - Catch all -->
                <rule name="React Router" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                        <add input="{REQUEST_URI}" pattern="^/api/" negate="true" />
                        <add input="{REQUEST_URI}" pattern="^/admin/" negate="true" />
                        <add input="{REQUEST_URI}" pattern="^/static/" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/index.html" />
                </rule>
            </rules>
        </rewrite>
        
        <!-- Compression -->
        <urlCompression doDynamicCompression="true" doStaticCompression="true" />
        
        <!-- Security Headers -->
        <httpProtocol>
            <customHeaders>
                <add name="X-Frame-Options" value="DENY" />
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-XSS-Protection" value="1; mode=block" />
                <add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains" />
                <add name="Content-Security-Policy" value="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';" />
            </customHeaders>
        </httpProtocol>
        
        <!-- Request Filtering -->
        <requestFiltering>
            <requestLimits maxAllowedContentLength="10485760" />
            <fileExtensions>
                <add fileExtension=".exe" allowed="false" />
                <add fileExtension=".bat" allowed="false" />
                <add fileExtension=".cmd" allowed="false" />
            </fileExtensions>
        </requestFiltering>
    </system.webServer>
</configuration>
'@

$webConfig | Out-File -FilePath "C:\inetpub\wwwroot\Admin3\static\web.config" -Encoding UTF8

# Execute deployment
Deploy-Application
Install-WaitressService

Write-Host "IIS and application deployment completed successfully!" -ForegroundColor Green