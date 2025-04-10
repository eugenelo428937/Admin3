# test_db.py
import psycopg2
import os

# Use the same credentials as in your settings
conn = psycopg2.connect(
    dbname=os.getenv('DB_NAME'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    host=os.getenv('DB_HOST'),
    port=os.getenv('DB_PORT')
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
