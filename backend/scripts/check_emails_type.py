
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
        for cid in [14, 6]:
            print(f"Checking Company {cid}")
            res = conn.execute(text(f"SELECT id, name, email FROM customers WHERE company_id = {cid}"))
            rows = res.fetchall()
            for r in rows:
                id, name, email = r
                print(f"  ID: {id}, Name: {name}, EmailType: {type(email)}, EmailValue: {repr(email)}")
except Exception as e:
    print(f"Error: {e}")
