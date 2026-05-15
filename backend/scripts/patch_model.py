import os, sys
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'app', 'models.py')

f = open(path, 'r', encoding='utf-8')
c = f.read()
f.close()

old = '    item: Mapped["Item"] = relationship("Item")\n    warehouse: Mapped[Optional["Warehouse"]] = relationship("Warehouse")\n\n    @property\n    def item_name(self) -> str | None:\n        return self.item.name if self.item else None\n\n\nclass AppSettings'

new = '    item: Mapped["Item"] = relationship("Item")\n    warehouse: Mapped[Optional["Warehouse"]] = relationship("Warehouse")\n    duty_tax: Mapped[Optional["DutyTax"]] = relationship("DutyTax")\n\n    @property\n    def item_name(self) -> str | None:\n        return self.item.name if self.item else None\n\n\nclass AppSettings'

if old in c:
    c = c.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(c)
    print('SUCCESS: duty_tax relationship added to PurchaseBillLine')
else:
    print('NOT FOUND - checking context...')
    idx = c.find('def item_name(self)')
    if idx >= 0:
        print(repr(c[idx-300:idx+50]))
    else:
        print('item_name not found at all')
