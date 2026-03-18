import os
import sys
import glob
import psycopg2
from dotenv import load_dotenv

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "../.."))
MIGRATIONS_DIR = os.path.join(ROOT_DIR, "code", "domain", "src", "migrations")

load_dotenv(os.path.join(ROOT_DIR, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable is required")
    sys.exit(1)


def get_connection():
    return psycopg2.connect(DATABASE_URL)


def ensure_migrations_table(conn):
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT NOW()
            )
        """)
    conn.commit()


def get_applied_migrations(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT name FROM _migrations ORDER BY name")
        return {row[0] for row in cur.fetchall()}


def get_pending_migrations(applied):
    files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    pending = []
    for f in files:
        name = os.path.basename(f)
        if name not in applied:
            pending.append((name, f))
    return pending


def apply_migration(conn, name, filepath):
    with open(filepath, "r") as f:
        sql = f.read()

    with conn.cursor() as cur:
        cur.execute(sql)
        cur.execute("INSERT INTO _migrations (name) VALUES (%s)", (name,))
    conn.commit()
    print(f"  Applied: {name}")


def main():
    print("=== Database Migration ===")
    print(f"  Migrations dir: {MIGRATIONS_DIR}")

    conn = get_connection()
    try:
        ensure_migrations_table(conn)
        applied = get_applied_migrations(conn)
        print(f"  Already applied: {len(applied)}")

        pending = get_pending_migrations(applied)
        if not pending:
            print("  No pending migrations.")
            return

        print(f"  Pending: {len(pending)}")
        for name, filepath in pending:
            apply_migration(conn, name, filepath)

        print("=== Migration complete ===")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
