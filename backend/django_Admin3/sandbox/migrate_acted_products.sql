-- SQL Script to copy acted_products from ACTEDDBDEVOLD to ACTEDDBDEV01
-- This script preserves IDs to maintain referential integrity

-- Step 1: Connect to target database (ACTEDDBDEV01) and create foreign server link
-- Run this in ACTEDDBDEV01 database:

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create foreign server
DROP SERVER IF EXISTS backup_server CASCADE;
CREATE SERVER backup_server
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host '127.0.0.1', port '5432', dbname 'ACTEDDBDEVOLD');

-- Create user mapping
DROP USER MAPPING IF EXISTS FOR actedadmin SERVER backup_server;
CREATE USER MAPPING FOR actedadmin
    SERVER backup_server
    OPTIONS (user 'actedadmin', password 'Act3d@dm1n0EEoo');

-- Step 2: Import foreign schema (just the table we need)
DROP SCHEMA IF EXISTS backup_data CASCADE;
CREATE SCHEMA backup_data;

IMPORT FOREIGN SCHEMA public
    LIMIT TO (acted_products)
    FROM SERVER backup_server
    INTO backup_data;

-- Step 3: Disable triggers on target table to preserve IDs
ALTER TABLE acted_products DISABLE TRIGGER ALL;

-- Step 4: Truncate target table (optional - comment out if you want to keep existing data)
TRUNCATE TABLE acted_products CASCADE;

-- Step 5: Copy data preserving IDs
INSERT INTO acted_products (
    id,
    fullname,
    shortname,
    description,
    code,
    created_at,
    updated_at,
    is_active,
    buy_both
)
SELECT 
    id,
    fullname,
    shortname,
    description,
    code,
    created_at,
    updated_at,
    is_active,
    buy_both
FROM backup_data.acted_products
ON CONFLICT (id) DO UPDATE SET
    fullname = EXCLUDED.fullname,
    shortname = EXCLUDED.shortname,
    description = EXCLUDED.description,
    code = EXCLUDED.code,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at,
    is_active = EXCLUDED.is_active,
    buy_both = EXCLUDED.buy_both;

-- Step 6: Re-enable triggers
ALTER TABLE acted_products ENABLE TRIGGER ALL;

-- Step 7: Reset sequence to max ID
SELECT setval(
    pg_get_serial_sequence('acted_products', 'id'),
    COALESCE((SELECT MAX(id) FROM acted_products), 1),
    true
);

-- Step 8: Show results
SELECT COUNT(*) as total_rows FROM acted_products;
SELECT MIN(id) as min_id, MAX(id) as max_id FROM acted_products;

-- Step 9: Clean up (optional - keep foreign server for future use)
-- DROP SCHEMA backup_data CASCADE;
-- DROP SERVER backup_server CASCADE;