"""
Migration: Add duty_taxes table and duty_tax_id columns

Run once to create new tables and columns for the Duties and Tax feature.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import engine, Base
from sqlalchemy import text

def upgrade():
    with engine.connect() as conn:
        # Create duty_taxes table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS duty_taxes (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                rate NUMERIC(5,2) NOT NULL,
                ledger_id INTEGER REFERENCES ledgers(id) ON DELETE SET NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT uq_duty_taxes_company_name UNIQUE (company_id, name)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_duty_taxes_company_id ON duty_taxes (company_id)"))

        # Add duty_tax_id to items
        conn.execute(text("""
            ALTER TABLE items ADD COLUMN IF NOT EXISTS duty_tax_id INTEGER REFERENCES duty_taxes(id) ON DELETE SET NULL
        """))

        # Add duty_tax_id to purchase_bill_lines
        conn.execute(text("""
            ALTER TABLE purchase_bill_lines ADD COLUMN IF NOT EXISTS duty_tax_id INTEGER REFERENCES duty_taxes(id) ON DELETE SET NULL
        """))

        conn.commit()
        print("Migration complete: duty_taxes table and columns created.")

if __name__ == "__main__":
    upgrade()
