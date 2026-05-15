
import os
import sys
# Add backend to path
sys.path.append('d:/Accounting System/API/backend')

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('d:/Accounting System/API/backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # Check all customers' emails for company 14 and 6
        for cid in [14, 6]:
            print(f"Checking Company {cid}")
            res = conn.execute(text(f"SELECT id, name, email FROM customers WHERE company_id = {cid}"))
            rows = res.fetchall()
            for r in rows:
                print(f"  ID: {r[0]}, Name: {r[1]}, Email: '{r[2]}'")
except Exception as e:
    print(f"Error: {e}")
