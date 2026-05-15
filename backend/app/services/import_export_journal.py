"""Balanced journal vouchers for import/export (reuses get_next_voucher_number; does not duplicate purchase bill posting)."""

from __future__ import annotations

from datetime import date
from typing import Sequence

from sqlalchemy.orm import Session

from app import models
from app.voucher_service import get_next_voucher_number


class JournalLineSpec:
    __slots__ = ("ledger_id", "debit", "credit", "department_id", "project_id", "remarks")

    def __init__(
        self,
        *,
        ledger_id: int,
        debit: float,
        credit: float,
        department_id: int | None = None,
        project_id: int | None = None,
        remarks: str | None = None,
    ):
        self.ledger_id = ledger_id
        self.debit = float(debit or 0)
        self.credit = float(credit or 0)
        self.department_id = department_id
        self.project_id = project_id
        self.remarks = remarks


def assert_balanced(lines: Sequence[JournalLineSpec]) -> None:
    from fastapi import HTTPException

    td = sum(l.debit for l in lines)
    tc = sum(l.credit for l in lines)
    if round(td - tc, 2) != 0:
        raise HTTPException(status_code=400, detail=f"Journal not balanced: debit={td:.2f} credit={tc:.2f}")


def create_journal_voucher(
    db: Session,
    *,
    company_id: int,
    voucher_date: date,
    narration: str,
    lines: list[JournalLineSpec],
) -> models.Voucher:
    from fastapi import HTTPException

    assert_balanced(lines)
    if not lines:
        raise HTTPException(status_code=400, detail="Journal lines required")

    voucher_number, fiscal_year, next_seq = get_next_voucher_number(
        db, company_id, models.VoucherType.JOURNAL, voucher_date
    )
    v = models.Voucher(
        company_id=company_id,
        voucher_date=voucher_date,
        voucher_type=models.VoucherType.JOURNAL,
        fiscal_year=fiscal_year,
        voucher_sequence=next_seq,
        voucher_number=voucher_number,
        narration=narration,
    )
    db.add(v)
    db.flush()
    for ln in lines:
        db.add(
            models.VoucherLine(
                voucher_id=v.id,
                ledger_id=ln.ledger_id,
                debit=ln.debit,
                credit=ln.credit,
                department_id=ln.department_id,
                project_id=ln.project_id,
                remarks=ln.remarks,
            )
        )
    db.flush()
    return v
