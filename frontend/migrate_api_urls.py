import os
import re

FRONTEND_DIR = r"d:\Accounting System\frontend\app"

# Mapping of Legacy URL regex patterns to V1 URL replacement strings
# We use Python regex groups to capture dynamic parts like companyId or id
PATTERNS = [
    # Sales Invoices
    (r"`/sales/companies/\$\{companyId\}/invoices`", r"`/api/v1/sales/invoices?company_id=${companyId}`"),
    (r"`/sales/companies/\$\{companyId\}/invoices/(\$\{[^}]+\})`", r"`/api/v1/sales/invoices/\1?company_id=${companyId}`"),
    
    # Inventory Items
    (r"`/inventory/companies/\$\{companyId\}/items`", r"`/api/v1/product/items?company_id=${companyId}`"),
    
    # Accounting Ledgers
    (r"`/ledgers/companies/\$\{companyId\}/ledgers`", r"`/api/v1/accounting/ledgers?company_id=${companyId}`"),
    
    # Auth
    (r"`/auth/me`", r"`/api/v1/auth/me`"),
    (r"'/auth/me'", r"'/api/v1/auth/me'"),
    (r"\"/auth/me\"", r"\"/api/v1/auth/me\""),
]

def migrate_files():
    files_modified = 0
    total_replacements = 0
    
    for root, dirs, files in os.walk(FRONTEND_DIR):
        for file in files:
            if not file.endswith(('.tsx', '.ts')):
                continue
                
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original_content = content
            file_replacements = 0
            
            for pattern, replacement in PATTERNS:
                # Use subn to get the number of replacements
                content, count = re.subn(pattern, replacement, content)
                file_replacements += count
                
            if file_replacements > 0:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                files_modified += 1
                total_replacements += file_replacements
                print(f"Updated {file_replacements} URLs in {os.path.relpath(filepath, FRONTEND_DIR)}")
                
    print(f"\nMigration Complete! Modified {files_modified} files with {total_replacements} total URL replacements.")

if __name__ == "__main__":
    migrate_files()
