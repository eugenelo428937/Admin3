import psycopg2
from psycopg2 import sql

# Database connection parameters
db_params = {    
    'dbname': 'ACTEDDBTEST01',
    'user': 'eugenelo1030',
    'password': 'Suke428937!',
    'host': '127.0.0.1',
    'port': '5432',
}

# User data to be inserted
user_data = {
    'firstname': 'John',
    'lastname': 'Doe',
    'password': 'securepassword123'
}

try:
    # Connect to the PostgreSQL database
    conn = psycopg2.connect(**db_params)
    cursor = conn.cursor()

    # Insert query
    insert_query = sql.SQL("""
        INSERT INTO "Users" (firstname, lastname, password)
        VALUES (%s, %s, %s)
        RETURNING id;
    """)

    # Execute the insert query
    cursor.execute(insert_query, (user_data['firstname'], user_data['lastname'], user_data['password']))

    # Get the id of the inserted record
    inserted_id = cursor.fetchone()[0]
    print(f"Inserted record ID: {inserted_id}")

    # Commit the transaction
    conn.commit()

except Exception as e:
    print(f"An error occurred: {e}")
    if conn:
        conn.rollback()

finally:
    # Close the cursor and connection
    if cursor:
        cursor.close()
    if conn:
        conn.close()
