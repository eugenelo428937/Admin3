# PostgreSQL Database Backup & Restore Guide (ACTEDDBDEV01) with pgAdmin 4

This guide provides step-by-step instructions to **backup** and **restore** the `ACTEDDBDEV01` database using pgAdmin 4.

---

## Prerequisites

- pgAdmin 4 installed and connected to your PostgreSQL server.
- Sufficient privileges to perform backup and restore operations.
- The database `ACTEDDBDEV01` exists on your PostgreSQL server.

---

## 1. Backup the Database

### Step 1: Open pgAdmin 4

- Launch pgAdmin 4 and connect to your PostgreSQL server.

### Step 2: Locate the Database

- In the **Browser** panel, expand your server group and server.
- Expand the **Databases** node.
- Right-click on `ACTEDDBDEV01`.

### Step 3: Initiate Backup

- Select **Backup...** from the context menu.

### Step 4: Configure Backup Options

- In the **Backup Database** dialog:
    - **Filename**: Click the folder icon and choose a location to save the backup file (e.g., `~/Documents/ACTEDDBDEV01_backup.backup`).
    - **Format**: Choose `Custom` or `Tar` (recommended for full backups).
    - Optionally, set **Compression Ratio** (default is fine).
    - Under **Dump Options #1**, you can select:
        - **Only data** or **Only schema** if you want a partial backup.
        - Leave both unchecked for a full backup.

### Step 5: Start Backup

- Click **Backup**.
- Wait for the process to complete. A success message will appear if the backup is successful.

---

## 2. Restore the Database

> **Note:** If restoring to a new database, create it first (see Step 1 below).

### Step 1: (Optional) Create a New Database

- Right-click on **Databases** in the Browser panel.
- Select **Create > Database...**
- Enter a name (e.g., `ACTEDDBDEV01_restore`) and click **Save**.

### Step 2: Initiate Restore

- Right-click on the target database (existing or newly created).
- Select **Restore...** from the context menu.

### Step 3: Configure Restore Options

- In the **Restore Database** dialog:
    - **Filename**: Click the folder icon and select your backup file (e.g., `ACTEDDBDEV01_backup.backup`).
    - **Format**: Should match the format used during backup (`Custom` or `Tar`).
    - Under **Restore Options**, you may want to:
        - Check **Clean before restore** to drop existing objects before restoring (use with caution).
        - Check **Create** if you want to create the database during restore (only if restoring from the server level).

### Step 4: Start Restore

- Click **Restore**.
- Wait for the process to complete. A success message will appear if the restore is successful.

---

## 3. Verification

- Expand the restored database in pgAdmin 4.
- Check that all tables, schemas, and data are present.
- Optionally, run queries to verify data integrity.

---

## 4. Tips & Best Practices

- Always test your backup file by restoring it to a test database.
- Store backup files in a secure, versioned location.
- Automate regular backups for production environments.
- For large databases, consider using command-line tools (`pg_dump`, `pg_restore`) for more control.

---

## References

- [pgAdmin 4 Backup Documentation](https://www.pgadmin.org/docs/pgadmin4/latest/backup_dialog.html)
- [pgAdmin 4 Restore Documentation](https://www.pgadmin.org/docs/pgadmin4/latest/restore_dialog.html)

