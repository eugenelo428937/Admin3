-- SQL Script to copy multiple tables from ACTEDDBDEVOLD to ACTEDDBDEV01
-- This script preserves IDs to maintain referential integrity

-- ==========================================
-- SETUP FOREIGN DATA WRAPPER
-- ==========================================

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

-- Import foreign schema
DROP SCHEMA IF EXISTS backup_data CASCADE;
CREATE SCHEMA backup_data;

-- Import all tables from backup
IMPORT FOREIGN SCHEMA public
    FROM SERVER backup_server
    INTO backup_data;

-- ==========================================
-- HELPER FUNCTION FOR TABLE MIGRATION
-- ==========================================

CREATE OR REPLACE FUNCTION migrate_table(table_name TEXT, truncate_first BOOLEAN DEFAULT TRUE)
RETURNS TEXT AS $$
DECLARE
    row_count INTEGER;
    max_id INTEGER;
    seq_name TEXT;
BEGIN
    -- Check if table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = migrate_table.table_name
    ) THEN
        RETURN 'Table ' || table_name || ' does not exist in target database';
    END IF;
    
    -- Disable triggers
    EXECUTE format('ALTER TABLE %I DISABLE TRIGGER ALL', table_name);
    
    -- Truncate if requested
    IF truncate_first THEN
        EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
    END IF;
    
    -- Copy data
    EXECUTE format('
        INSERT INTO %I 
        SELECT * FROM backup_data.%I
        ON CONFLICT DO NOTHING
    ', table_name, table_name);
    
    GET DIAGNOSTICS row_count = ROW_COUNT;
    
    -- Re-enable triggers
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER ALL', table_name);
    
    -- Reset sequence if table has id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = migrate_table.table_name 
        AND column_name = 'id'
    ) THEN
        SELECT pg_get_serial_sequence(table_name, 'id') INTO seq_name;
        IF seq_name IS NOT NULL THEN
            EXECUTE format('SELECT MAX(id) FROM %I', table_name) INTO max_id;
            IF max_id IS NOT NULL THEN
                EXECUTE format('SELECT setval(%L, %s, true)', seq_name, max_id);
            END IF;
        END IF;
    END IF;
    
    RETURN 'Migrated ' || row_count || ' rows to ' || table_name;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRATE SPECIFIC TABLES
-- ==========================================

-- Start transaction
BEGIN;

-- Migrate acted_products
SELECT migrate_table('acted_products', true);

-- Add more tables as needed:
-- SELECT migrate_table('acted_users', true);
-- SELECT migrate_table('acted_orders', true);
-- SELECT migrate_table('acted_order_items', true);

-- Show results
SELECT 
    'acted_products' as table_name,
    COUNT(*) as row_count,
    MIN(id) as min_id,
    MAX(id) as max_id
FROM acted_products;

-- Commit if everything is successful
COMMIT;

-- ==========================================
-- OPTIONAL: List all available tables
-- ==========================================

-- Uncomment to see all tables available for migration:
/*
SELECT 
    t.table_name,
    (SELECT COUNT(*) FROM backup_data.table_name) as source_rows
FROM information_schema.tables t
WHERE t.table_schema = 'backup_data'
ORDER BY t.table_name;
*/

-- ==========================================
-- CLEANUP (Optional)
-- ==========================================

-- Keep these commented unless you want to remove the foreign server setup
-- DROP FUNCTION IF EXISTS migrate_table(TEXT, BOOLEAN);
-- DROP SCHEMA backup_data CASCADE;
-- DROP SERVER backup_server CASCADE;