# AWS Application Load Balancer Setup Guide

## Step 1: Create Target Group (5 minutes)

1. **AWS Console** → **EC2** → **Target Groups** → **Create target group**
2. **Settings:**
   - Target type: `Instances`
   - Protocol: `HTTP`
   - Port: `8888`
   - VPC: Select your default VPC
   - Health check path: `/api/utils/health/`
   - Health check interval: `30 seconds`
   - Healthy threshold: `2`
   - Unhealthy threshold: `3`

3. **Register targets:**
   - Select your EC2 instance
   - Port: `8888`
   - Click **Include as pending below**
   - Click **Create target group**

## Step 2: Request SSL Certificate (3 minutes)

1. **AWS Console** → **Certificate Manager** → **Request certificate**
2. **Domain name:** `ec2-35-176-108-52.eu-west-2.compute.amazonaws.com`
3. **Validation method:** `DNS validation`
4. Click **Request**
5. Wait 2-5 minutes for validation (AWS auto-validates EC2 DNS names)

## Step 3: Create Application Load Balancer (5 minutes)

1. **AWS Console** → **EC2** → **Load Balancers** → **Create Load Balancer**
2. **Select:** `Application Load Balancer`
3. **Basic configuration:**
   - Name: `admin3-alb`
   - Scheme: `Internet-facing`
   - IP address type: `IPv4`

4. **Network mapping:**
   - VPC: Select your default VPC
   - Availability Zones: Select at least 2 zones
   - Select public subnets

5. **Security groups:**
   - Create new security group or select existing
   - **Rules needed:**
     - HTTP (80) from 0.0.0.0/0
     - HTTPS (443) from 0.0.0.0/0

6. **Listeners:**
   - **HTTP (80):** Create listener
   - **HTTPS (443):** Create listener

## Step 4: Configure Listeners (2 minutes)

### HTTP Listener (Port 80):
- **Action:** Redirect to HTTPS
- **Port:** 443
- **Status code:** 301

### HTTPS Listener (Port 443):
- **Action:** Forward to target group
- **Target group:** Select the one you created
- **SSL certificate:** Select your certificate

## Step 5: Update DNS (Optional)
- Copy ALB DNS name (e.g., `admin3-alb-123456789.eu-west-2.elb.amazonaws.com`)
- You can use this instead of EC2 DNS if preferred

## Final URLs:
- **Main app:** `https://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com`
- **API health:** `https://ec2-35-176-108-52.eu-west-2.compute.amazonaws.com/api/utils/health/`

## Troubleshooting:
- **502 Bad Gateway:** Check your Django server is running on port 8888
- **Certificate issues:** Wait 5-10 minutes for validation
- **Health check fails:** Ensure `/api/utils/health/` returns 200 status

Total setup time: ~15 minutes
Monthly cost: ~$18 USD for ALB