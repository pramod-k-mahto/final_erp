
import sys
import os

# Add the parent directory to sys.path to allow importing backend.app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from backend.app.database import SessionLocal
from backend.app import models

def dump_menus():
    db = SessionLocal()
    try:
        menus = db.query(models.Menu).order_by(models.Menu.id).all()
        print("ID | Name | Code")
        print("-" * 50)
        for m in menus:
            print(f"{m.id} | {m.label} | {m.code}")
    finally:
        db.close()

if __name__ == "__main__":
    dump_menus()
