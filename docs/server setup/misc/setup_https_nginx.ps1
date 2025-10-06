# Quick HTTPS Setup with nginx and Self-Signed Certificate
# Run as Administrator

Write-Host "Setting up HTTPS with nginx..." -ForegroundColor Green

# Install Chocolatey if not exists
if (!(Get-Command choco.exe -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install nginx
Write-Host "Installing nginx..." -ForegroundColor Yellow
choco install nginx -y

# Create SSL directory
$sslDir = "C:\tools\nginx\conf\ssl"
New-Item -ItemType Directory -Path $sslDir -Force

# Generate self-signed certificate
Write-Host "Generating self-signed certificate..." -ForegroundColor Yellow
$cert = New-SelfSignedCertificate -DnsName "ec2-35-176-108-52.eu-west-2.compute.amazonaws.com", "35.176.108.52" -CertStoreLocation "cert:\LocalMachine\My" -KeyLength 2048 -NotAfter (Get-Date).AddYears(1)

# Export certificate
$certPath = "$sslDir\server.crt"
$keyPath = "$sslDir\server.key"
Export-Certificate -Cert $cert -FilePath $certPath -Type CERT
$certPwd = ConvertTo-SecureString -String "nginx123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "$sslDir\server.pfx" -Password $certPwd

# Convert PFX to PEM format (key extraction)
openssl pkcs12 -in "$sslDir\server.pfx" -nocerts -out $keyPath -nodes -passin pass:nginx123
openssl pkcs12 -in "$sslDir\server.pfx" -clcerts -nokeys -out $certPath -passin pass:nginx123

# Create nginx config
$nginxConfig = @"
worker_processes 1;
events {
    worker_connections 1024;
}

http {
    upstream django_backend {
        server 127.0.0.1:8888;
    }

    upstream react_frontend {
        server 127.0.0.1:3000;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name ec2-35-176-108-52.eu-west-2.compute.amazonaws.com 35.176.108.52;

        ssl_certificate ssl/server.crt;
        ssl_certificate_key ssl/server.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # API requests to Django
        location /api/ {
            proxy_pass http://django_backend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
        }

        # Everything else to React
        location / {
            proxy_pass http://react_frontend;
            proxy_set_header Host `$host;
            proxy_set_header X-Real-IP `$remote_addr;
            proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto `$scheme;
            
            # WebSocket support for React dev server
            proxy_http_version 1.1;
            proxy_set_header Upgrade `$http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name ec2-35-176-108-52.eu-west-2.compute.amazonaws.com 35.176.108.52;
        return 301 https://`$server_name`$request_uri;
    }
}
"@

$nginxConfig | Out-File -FilePath "C:\tools\nginx\conf\nginx.conf" -Encoding UTF8

Write-Host "Starting nginx..." -ForegroundColor Green
Start-Service nginx

Write-Host "HTTPS setup complete!" -ForegroundColor Green
Write-Host "Note: You'll see a security warning - click 'Advanced' then 'Proceed' to accept the self-signed certificate" -ForegroundColor Red