
"""
Migration: Add employee_id to vouchers and voucher_lines
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app.database import engine
from sqlalchemy import text

def upgrade():
    with engine.connect() as conn:
        print("Adding employee_id to vouchers table...")
        try:
            conn.execute(text("ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL"))
            print("Successfully added employee_id to vouchers.")
        except Exception as e:
            print(f"Error adding employee_id to vouchers: {e}")

        print("Adding employee_id to voucher_lines table...")
        try:
            conn.execute(text("ALTER TABLE voucher_lines ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL"))
            print("Successfully added employee_id to voucher_lines.")
        except Exception as e:
            print(f"Error adding employee_id to voucher_lines: {e}")

        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    upgrade()
