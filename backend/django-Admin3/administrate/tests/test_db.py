# test_db.py
import psycopg2
import os

# Use the same credentials as in your settings
conn = psycopg2.connect(
    dbname=os.getenv('DB_NAME', 'ACTEDDBDEV01'),
    user=os.getenv('DB_USER', 'actedadmin'),
    password=os.getenv('DB_PASSWORD', 'Act3d@dm1n0EEoo'),
    host=os.getenv('DB_HOST', 'localhost'),
    port=os.getenv('DB_PORT', '5432')
)

cur = conn.cursor()

# Try to create the schema
cur.execute("CREATE SCHEMA IF NOT EXISTS adm;")

# Create a test table in the schema
cur.execute("""
CREATE TABLE IF NOT EXISTS adm.test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);
""")

# Insert some data
cur.execute("INSERT INTO adm.test_table (name) VALUES ('Test1');")

# Query the data
cur.execute("SELECT * FROM adm.test_table;")
rows = cur.fetchall()
print(f"Rows in test table: {rows}")

# Commit and close
conn.commit()
cur.close()
conn.close()

print("Database test completed successfully")
