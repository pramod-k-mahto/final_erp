from backend.app.database import engine
from sqlalchemy import text

values = ["DRAFT", "APPROVED", "RUNNING", "RELEASED", "COMPLETED", "CANCELLED"]

with engine.connect() as conn:
    for val in values:
        try:
            conn.execute(text(f"ALTER TYPE production_order_status ADD VALUE IF NOT EXISTS '{val}'"))
            print(f"Added/verified: {val}")
        except Exception as e:
            print(f"Skipped {val}: {e}")
    conn.commit()

print("Done")
