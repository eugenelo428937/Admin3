# Run the following command in the AWS EC2 instance CLI

# Create EC2 Security Group
aws ec2 create-security-group --group-name Admin3-EC2-SG --description "Security group for Admin3 EC2 instance"

# Add inbound rules for EC2
aws ec2 authorize-security-group-ingress --group-name Admin3-EC2-SG --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name Admin3-EC2-SG --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name Admin3-EC2-SG --protocol tcp --port 3389 --cidr YOUR_IP/32

# Create RDS Security Group
aws ec2 create-security-group --group-name Admin3-RDS-SG --description "Security group for Admin3 RDS instance"

# Add inbound rule for RDS (from EC2 security group)
aws ec2 authorize-security-group-ingress --group-name Admin3-RDS-SG --protocol tcp --port 5432 --source-group Admin3-EC2-SG