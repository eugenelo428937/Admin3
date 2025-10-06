# Configure nginx for standard HTTPS port 443
Write-Host "Configuring nginx for standard port 443..." -ForegroundColor Green

# Stop nginx if running
try {
    Stop-Service nginx -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped nginx service" -ForegroundColor Yellow
} catch {
    Write-Host "nginx service not running" -ForegroundColor Gray
}

# Find nginx installation path
$nginxPaths = @(
    "C:\nginx\nginx-1.29.0\"
)

$nginxPath = $null
foreach ($path in $nginxPaths) {
    if (Test-Path "$path\nginx.exe") {
        $nginxPath2 = $path
        break
    }
}

if (-not $nginxPath) {
    Write-Host "nginx not found! Please install nginx first." -ForegroundColor Red
    exit
}

Write-Host "Found nginx at: $nginxPath" -ForegroundColor Green

# Create SSL directory
$sslDir = "$nginxPath\conf\ssl"
New-Item -ItemType Directory -Path $sslDir -Force

# Generate self-signed certificate
Write-Host "Generating self-signed certificate..." -ForegroundColor Yellow
$cert = New-SelfSignedCertificate -DnsName "ec2-35-176-108-52.eu-west-2.compute.amazonaws.com", "35.176.108.52" -CertStoreLocation "cert:\LocalMachine\My" -KeyLength 2048 -NotAfter (Get-Date).AddYears(1)

# Export certificate and key
$certPath = "$sslDir\server.crt"
$keyPath = "$sslDir\server.key"
$pfxPath = "$sslDir\server.pfx"

# Create password for PFX
$certPwd = ConvertTo-SecureString -String "nginx123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $certPwd

# Check if OpenSSL is available
if (Get-Command openssl -ErrorAction SilentlyContinue) {
    Write-Host "Converting certificate using OpenSSL..." -ForegroundColor Yellow
    openssl pkcs12 -in $pfxPath -nocerts -out $keyPath -nodes -passin pass:nginx123
    openssl pkcs12 -in $pfxPath -clcerts -nokeys -out $certPath -passin pass:nginx123
} else {
    Write-Host "OpenSSL not found. Installing..." -ForegroundColor Yellow
    choco install openssl.light -y
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
        openssl pkcs12 -in $pfxPath -nocerts -out $keyPath -nodes -passin pass:nginx123
        openssl pkcs12 -in $pfxPath -clcerts -nokeys -out $certPath -passin pass:nginx123
    } else {
        Write-Host "Could not install OpenSSL. Using alternative method..." -ForegroundColor Red
        # Alternative: Export directly from PowerShell (less ideal but works)
        $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
        [System.IO.File]::WriteAllBytes($certPath, $certBytes)
        Write-Host "Certificate exported. Key extraction may need manual setup." -ForegroundColor Yellow
    }
}

# Create comprehensive nginx configuration
$nginxConfig = @"
worker_processes 1;
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # Upstream definitions
    upstream django_backend {
        server 127.0.0.1:8888;
    }

    upstream react_frontend {
        server 127.0.0.1:3000;
    }

    # HTTPS Server on standard port 443
    server {
        listen 443 ssl http2;
        server_name ec2-35-176-108-52.eu-west-2.compute.amazonaws.com 35.176.108.52 localhost;

        # SSL Configuration
        ssl_certificate ssl/server.crt;
        ssl_certificate_key ssl/server.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:1m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API requests to Django backend
        location /api/ {
            proxy_pass http://django_backend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
            proxy_set_header X-Forwarded-Host `$host;
            proxy_set_header X-Forwarded-Port `$server_port;
            
            # Handle CORS preflight requests
            if (`$request_method = OPTIONS) {
                add_header Access-Control-Allow-Origin *;
                add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE";
                add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization, X-Requested-With";
                add_header Content-Length 0;
                add_header Content-Type text/plain;
                return 200;
            }
        }

        # Django admin interface
        location /admin/ {
            proxy_pass http://django_backend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
        }

        # Static files for Django
        location /static/ {
            proxy_pass http://django_backend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
        }

        # Everything else to React frontend
        location / {
            proxy_pass http://react_frontend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
            
            # WebSocket support for React development server
            proxy_http_version 1.1;
            proxy_set_header Upgrade `$http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Handle React Router (SPA routing)
            try_files `$uri `$uri/ @react;
        }

        # Fallback for React Router
        location @react {
            proxy_pass http://react_frontend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
            
            proxy_http_version 1.1;
            proxy_set_header Upgrade `$http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }

    # Redirect HTTP to HTTPS (skip port 80 to avoid conflicts)
    # Users should access directly via HTTPS
    server {
        listen 8080;
        server_name ec2-35-176-108-52.eu-west-2.compute.amazonaws.com 35.176.108.52 localhost;
        return 301 https://`$server_name`$request_uri;
    }
}
"@

# Write nginx configuration
$nginxConfig | Out-File -FilePath "$nginxPath\conf\nginx.conf" -Encoding UTF8
Write-Host "nginx configuration updated" -ForegroundColor Green

# Start nginx
Write-Host "Starting nginx..." -ForegroundColor Yellow
try {
    Start-Process -FilePath "$nginxPath\nginx.exe" -WorkingDirectory $nginxPath -WindowStyle Hidden
    Write-Host "nginx started successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to start nginx: $_" -ForegroundColor Red
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "Your app is now available at:" -ForegroundColor Yellow
Write-Host "HTTPS: https://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com/" -ForegroundColor Cyan
Write-Host "HTTP:  http://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com:8080/ (redirects to HTTPS)" -ForegroundColor Cyan
Write-Host "`nAPI endpoints:" -ForegroundColor Yellow
Write-Host "Health: https://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com/api/utils/health/" -ForegroundColor Gray
Write-Host "Admin:  https://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com/admin/" -ForegroundColor Gray

Write-Host "`nNote: You'll see a security warning for the self-signed certificate." -ForegroundColor Red
Write-Host "Click 'Advanced' then 'Proceed to site' to continue." -ForegroundColor Red

Write-Host "`nMake sure your Django and React servers are running:" -ForegroundColor Yellow
Write-Host "Django: python manage.py runserver 0.0.0.0:8888" -ForegroundColor Gray
Write-Host "React:  npm start (should be on port 3000)" -ForegroundColor Gray