#!/bin/sh
# nginx/generate-cert.sh
# Generates self-signed SSL certificate for staging.
# Runs automatically on Nginx container startup via /docker-entrypoint.d/

CERT_DIR=/etc/nginx/ssl
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "[cert] SSL certificate already exists, skipping generation."
    exit 0
fi

echo "[cert] Generating self-signed SSL certificate..."
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=GB/ST=London/L=London/O=ActEd/OU=Development/CN=${SERVER_NAME:-staging.acted.local}"

echo "[cert] Self-signed certificate generated:"
echo "       Certificate: $CERT_FILE"
echo "       Key:         $KEY_FILE"
echo "       Valid for:   365 days"
echo "       CN:          ${SERVER_NAME:-staging.acted.local}"
