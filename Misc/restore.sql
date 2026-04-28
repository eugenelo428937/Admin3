SET session_replication_role = 'replica';

DO $$
DECLARE r record;
BEGIN
    FOR r IN SELECT schemaname, tablename FROM pg_tables
             WHERE schemaname IN ('acted','adm','public')
               AND tablename NOT IN (
                   'django_migrations',
                   'django_content_type',
                   'auth_permission'
               )
    LOOP
        EXECUTE 'TRUNCATE ' || quote_ident(r.schemaname) || '.'
                || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
    END LOOP;
END $$;

\i C:/Users/elo/dev_data_backup.sql

SET session_replication_role = 'origin';
