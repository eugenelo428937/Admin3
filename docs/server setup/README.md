# Admin3 Secure Server Setup

This directory contains secure server setup scripts that use environment variables for sensitive configuration.

## 🔐 Security Architecture

### Files Overview
**Secure Scripts (Safe to Commit):**
- `run-setup.ps1` - Master orchestration script
- `01-initial-ec2-setup.ps1` to `15-deployment-automation.ps1` - Individual setup scripts
- `load-environment.ps1` - Environment variable loader
- `.env.uat` - UAT environment template (safe to commit)
- `.env.example` - Template showing required environment variables (safe to commit)
- `README.md` - This documentation

**Sensitive Files (NEVER COMMIT):**
- `.env` - Your actual production environment variables
- `*.log` - Log files may contain sensitive information
- SSL certificates and keys

### Security Features
- ✅ **Zero Hardcoded Credentials** - All sensitive data externalized to environment variables
- ✅ **Environment Variable Integration** - Scripts automatically load from `.env` files
- ✅ **Comprehensive Logging** with sensitive data redaction
- ✅ **Git-Safe** - All scripts are safe to commit to version control
- ✅ **Flexible Configuration** - Support for multiple environments (UAT, Production, etc.)
- ✅ **Automatic Fallbacks** - Scripts work even if some environment variables are missing

## 🚀 Quick Start

### 1. Setup Environment Variables
```powershell
# Copy the UAT template and configure for your environment
Copy-Item ".env.uat" ".env"

# Edit .env with your actual credentials (NEVER commit this file)
notepad .env

# OR copy from example template
Copy-Item ".env.example" ".env"
```

### 2. Run Complete Setup
```powershell
# Navigate to scripts directory
cd "C:\Code\Admin3\Project settings\server setup"

# Test run first (recommended)
.\run-setup.ps1 -DryRun

# Full automated installation
.\run-setup.ps1

# With specific options
.\run-setup.ps1 -SkipInitialSetup -RunTests
```

### 3. Run Individual Scripts
```powershell
# Load environment variables first
. .\load-environment.ps1

# Then run any individual script
.\02-rds-database-setup.ps1
.\03-redis-installation.ps1
.\08-troubleshooting.ps1
```

## 📋 Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | Database server hostname | `acteddbdev01.amazonaws.com` |
| `DB_NAME` | Database name | `admin3_production` |
| `DB_USER` | Database username | `admin3_user` |
| `DB_PASSWORD` | Database password | `SecurePassword123!` |
| `DJANGO_SECRET_KEY` | Django secret key | `your-50-char-secret-key` |
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `xyz...` |

See `.env.example` for the complete list of required variables.

## 🛡️ Security Best Practices

### Development Environment
- Use local `.env` files
- Never commit `.env` to version control
- Use weak credentials for development data

### Production Environment
- Use AWS Secrets Manager or Azure Key Vault
- Rotate credentials regularly
- Use least-privilege access principles
- Enable audit logging

### CI/CD Pipeline
- Use encrypted environment variables
- Inject secrets at deployment time
- Never log sensitive values

## 🔧 Script Features

### Command Line Options
- `-EnvFile` - Specify custom environment file (default: `.env`)
- `-SkipDependencies` - Skip system dependency installation
- `-DryRun` - Test run without making changes
- `-Verbose` - Show detailed output (redacts sensitive values)

### What the Script Does
1. **System Preparation**
   - Installs IIS and required Windows features
   - Installs Python, Node.js, Redis, PostgreSQL
   - Configures system prerequisites

2. **Application Deployment**
   - Creates application directories
   - Generates Django production settings with environment variables
   - Configures database and cache connections

3. **Security Configuration**
   - Configures Windows Firewall rules
   - Sets up SSL certificates
   - Implements security policies

4. **Monitoring Setup**
   - Creates log directories
   - Configures application logging
   - Sets up monitoring infrastructure

### Logging and Monitoring
- Comprehensive logging with timestamps
- Sensitive data redaction in logs
- Separate log files for different components
- Integration with CloudWatch (when configured)

## 🚨 Important Security Notes

1. **Never commit your `.env` file** - It contains sensitive credentials
2. **Regularly rotate credentials** - Especially for production environments  
3. **Use strong passwords** - Follow your organization's password policy
4. **Limit access** - Only authorized personnel should have access to production credentials
5. **Monitor access** - Enable audit logging for credential access
6. **Backup securely** - Encrypted backups with separate key management

## 🔍 Troubleshooting

### Common Issues

**Script fails to load environment variables:**
- Ensure `.env` file exists and has correct syntax
- Check that all required variables are defined
- Verify no special characters in variable names

**Permission denied errors:**
- Run PowerShell as Administrator
- Check Windows execution policy: `Get-ExecutionPolicy`
- If needed: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Database connection failures:**
- Verify database credentials in `.env`
- Check network connectivity to database server
- Ensure database server allows connections from your IP

### Getting Help
- Check the setup log files in the script directory
- Use `-Verbose` flag for detailed output
- Use `-DryRun` flag to test configuration without making changes

## 📝 Environment File Format

Your `.env` file should follow this format:
```bash
# Comments start with #
VARIABLE_NAME=value
DB_PASSWORD=my-secure-password

# No spaces around the equals sign
# Values with spaces don't need quotes
# But quotes are supported and will be stripped
```

## 🔄 Integration with CI/CD

For automated deployments, you can:
1. Store secrets in your CI/CD platform's secret management
2. Generate `.env` file during deployment
3. Run the script with appropriate flags

Example GitHub Actions integration:
```yaml
- name: Generate environment file
  run: |
    echo "DB_PASSWORD=${{ secrets.DB_PASSWORD }}" >> .env
    echo "DJANGO_SECRET_KEY=${{ secrets.DJANGO_SECRET_KEY }}" >> .env

- name: Run server setup
  run: .\secure-server-setup.ps1 -SkipDependencies
```