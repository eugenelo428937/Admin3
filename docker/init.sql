-- docker/init.sql
-- Runs on first PostgreSQL container start via docker-entrypoint-initdb.d
-- Creates the schemas required by Admin3 Django models

CREATE SCHEMA IF NOT EXISTS acted;
CREATE SCHEMA IF NOT EXISTS adm;

-- Grant permissions to the default user (POSTGRES_USER from docker-compose)
GRANT ALL ON SCHEMA acted TO CURRENT_USER;
GRANT ALL ON SCHEMA adm TO CURRENT_USER;
