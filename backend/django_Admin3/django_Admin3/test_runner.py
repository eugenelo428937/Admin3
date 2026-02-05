"""Custom test runner for Admin3.

PostgreSQLTestRunner terminates lingering database connections before
dropping/creating the test database. Used by all test settings
(settings.test, settings.development, settings.ci).
"""
import sys

from django.test.runner import DiscoverRunner


class PostgreSQLTestRunner(DiscoverRunner):
    """Test runner that force-drops the test DB before Django tries to create it.

    Solves the common error:
        'database "test_ACTEDDBDEV01" is being accessed by other users'

    Django's _create_test_db does DROP DATABASE via a direct cursor.execute()
    (not through the overridable _destroy_test_db method), so monkey-patching
    won't help. Instead, we pre-emptively terminate connections and drop the
    test DB ourselves, so Django's CREATE DATABASE succeeds on first try.
    """

    def setup_databases(self, **kwargs):
        self._force_drop_test_dbs()
        return super().setup_databases(**kwargs)

    def teardown_databases(self, old_config, **kwargs):
        self._force_drop_test_dbs()
        return super().teardown_databases(old_config, **kwargs)

    def _force_drop_test_dbs(self):
        """Terminate connections and drop test DB before Django touches it.

        Uses psycopg2 directly instead of Django's _nodb_cursor(), which
        may not be fully initialized this early in the runner lifecycle.
        """
        import psycopg2

        from django.conf import settings

        for alias, db_settings in settings.DATABASES.items():
            if not db_settings.get('ENGINE', '').endswith('postgresql'):
                continue

            db_name = db_settings.get('NAME')
            if not db_name:
                continue
            # Use `or` (not .get default) because Django's ConnectionHandler
            # adds TEST: {'NAME': None} via setdefault before we run.
            # .get('NAME', fallback) returns None when key exists with None value.
            test_db_name = (
                db_settings.get('TEST', {}).get('NAME') or f'test_{db_name}'
            )

            try:
                # Connect to 'postgres' maintenance DB directly
                conn = psycopg2.connect(
                    dbname='postgres',
                    user=db_settings.get('USER', ''),
                    password=db_settings.get('PASSWORD', ''),
                    host=db_settings.get('HOST', '127.0.0.1'),
                    port=db_settings.get('PORT', '5432'),
                )
                conn.autocommit = True  # Required for DROP DATABASE

                with conn.cursor() as cursor:
                    # Terminate all connections in one shot
                    cursor.execute(
                        "SELECT pg_terminate_backend(pid) "
                        "FROM pg_stat_activity "
                        "WHERE datname = %s AND pid <> pg_backend_pid()",
                        [test_db_name],
                    )
                    # Drop immediately — no gap for reconnections
                    cursor.execute(
                        'DROP DATABASE IF EXISTS "%s"' % test_db_name
                    )
                    if self.verbosity >= 1:
                        print(
                            f"Pre-dropped test database '{test_db_name}'"
                        )
                conn.close()
            except Exception as e:
                if self.verbosity >= 1:
                    print(
                        f"Note: Could not pre-drop test DB: {e}",
                        file=sys.stderr,
                    )
