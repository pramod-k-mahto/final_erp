
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
        print(f"Checking ALL customers in the DB")
        res = conn.execute(text(f"SELECT id, name, email FROM customers"))
        rows = res.fetchall()
        invalid_count = 0
        for r in rows:
            id, name, email = r
            if email and not (isinstance(email, str) and '@' in email):
                print(f"  POTENTIALLY INVALID: ID: {id}, Name {name}, EmailType {type(email)}, Email: {repr(email)}")
                invalid_count += 1
        print(f"Total invalid emails found: {invalid_count}")
except Exception as e:
    print(f"Error: {e}")
