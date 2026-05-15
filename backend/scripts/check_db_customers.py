
import os
import sys
# Add backend to path so we can use its utilities if needed
sys.path.append('d:/Accounting System/API/backend')

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv('d:/Accounting System/API/backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    sys.exit(1)

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # Check companies
        res = conn.execute(text("SELECT id, name FROM companies"))
        companies = res.fetchall()
        print(f"Companies count: {len(companies)}")
        for c in companies:
            print(f"Company ID: {c[0]}, Name: {c[1]}")
            
            # Check customers for each company
            cust_res = conn.execute(text(f"SELECT id, name FROM customers WHERE company_id = {c[0]}"))
            customers = cust_res.fetchall()
            print(f"  Customers for company {c[0]}: {len(customers)}")
            for cust in customers:
                print(f"    - ID: {cust[0]}, Name: {cust[1]}")
except Exception as e:
    print(f"Error: {e}")
