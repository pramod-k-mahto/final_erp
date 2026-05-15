from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user
from ..dependencies import get_company_secure

router = APIRouter(prefix="/companies/{company_id}/commissions", tags=["commissions"])


def _get_company(db: Session, company_id: int, user: models.User) -> models.Company:
    return get_company_secure(db, company_id, user)


# --- Rules CRUD ---

@router.get("/rules", response_model=List[schemas.CommissionRuleRead])
def list_commission_rules(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_company(db, company_id, current_user)
    return db.query(models.CommissionRule).filter(
        models.CommissionRule.company_id == company_id,
        models.CommissionRule.is_active == True
    ).all()

@router.post("/rules", response_model=schemas.CommissionRuleRead)
def create_commission_rule(
    company_id: int,
    rule_in: schemas.CommissionRuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_company(db, company_id, current_user)
    rule = models.CommissionRule(**rule_in.model_dump(), company_id=company_id)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.put("/rules/{rule_id}", response_model=schemas.CommissionRuleRead)
def update_commission_rule(
    company_id: int,
    rule_id: int,
    rule_in: schemas.CommissionRuleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_company(db, company_id, current_user)
    rule = db.query(models.CommissionRule).filter(
        models.CommissionRule.company_id == company_id,
        models.CommissionRule.id == rule_id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    for field, value in rule_in.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/rules/{rule_id}")
def delete_commission_rule(
    company_id: int,
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_company(db, company_id, current_user)
    rule = db.query(models.CommissionRule).filter(
        models.CommissionRule.company_id == company_id,
        models.CommissionRule.id == rule_id
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Soft delete
    rule.is_active = False
    db.commit()
    return {"ok": True}

# --- Calculation Report ---

# --- Calculation Report ---

def _compute_commission_report(
    db: Session,
    company_id: int,
    start_date: date,
    end_date: date,
    sales_person_id: int | None = None,
    ledger_id: int | None = None,
    department_id: int | None = None,
    project_id: int | None = None,
    segment_id: int | None = None,
    group_by: str = "LEDGER",
    calendar: str = "AD",
):
    rules = db.query(models.IncentiveRule).filter(
        models.IncentiveRule.company_id == company_id,
        models.IncentiveRule.is_active == True
    ).all()

    # Load company for default ledger
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    default_ledger_id = company.default_incentive_expense_ledger_id if company else None

    # Load ledger names for mapping
    ledger_ids = set()
    if default_ledger_id: ledger_ids.add(default_ledger_id)
    for r in rules:
        if r.ledger_id: ledger_ids.add(r.ledger_id)
    
    ledger_names = {}
    if ledger_ids:
        ledger_names = {
            l.id: l.name 
            for l in db.query(models.Ledger.id, models.Ledger.name)
            .filter(models.Ledger.id.in_(list(ledger_ids)))
            .all()
        }

    # 2. Fetch Invoices in period
    query = db.query(models.SalesInvoice).options(
        joinedload(models.SalesInvoice.incentives).joinedload(models.SalesInvoiceIncentive.sales_person),
        joinedload(models.SalesInvoice.voucher).joinedload(models.Voucher.payment_mode),
        joinedload(models.SalesInvoice.sales_person),
        joinedload(models.SalesInvoice.customer).joinedload(models.Customer.ledger),
        joinedload(models.SalesInvoice.lines)
    ).filter(
        models.SalesInvoice.company_id == company_id,
        models.SalesInvoice.date >= start_date,
        models.SalesInvoice.date <= end_date
    )

    if sales_person_id:
        query = query.filter(models.SalesInvoice.sales_person_id == sales_person_id)

    invoices = query.all()

    # 3. Calculate
    report_data = {}
    import nepali_datetime
    ledger_names_all = {l.id: l.name for l in db.query(models.Ledger.id, models.Ledger.name).filter(models.Ledger.company_id == company_id).all()}

    for inv in invoices:
        # Filter by ledger if requested
        if ledger_id and inv.customer and inv.customer.ledger_id != ledger_id:
            continue
            
        involved_persons = []
        if inv.incentives:
            for inc in inv.incentives:
                if inc.sales_person and inc.sales_person_id not in [p.id for p in involved_persons]:
                    involved_persons.append(inc.sales_person)
        elif inv.sales_person:
            involved_persons.append(inv.sales_person)

        if not involved_persons:
            continue

        for emp in involved_persons:
            # Determine Context
            eff_project_id = inv.project_id or getattr(emp, "project_id", None)
            eff_dept_id = inv.department_id or getattr(emp, "department_id", None)
            eff_segment_id = getattr(inv, "segment_id", None) or getattr(emp, "segment_id", None)

            # Optional report filters
            if department_id is not None and int(department_id) != int(eff_dept_id or 0):
                continue
            if project_id is not None and int(project_id) != int(eff_project_id or 0):
                continue
            if segment_id is not None and int(segment_id) != int(eff_segment_id or 0):
                continue

            # Key for grouping
            if group_by == "MONTH":
                d = inv.date
                if calendar == "BS":
                    nd = nepali_datetime.date.from_datetime_date(d)
                    y, m, m_name = nd.year, nd.month, nd.strftime("%B")
                else:
                    y, m, m_name = d.year, d.month, d.strftime("%B")
                group_key = (y, m, emp.id)
            else:
                group_key = emp.id

            if group_key not in report_data:
                report_data[group_key] = {
                    "employee_id": emp.id,
                    "employee_name": getattr(emp, "name", getattr(emp, "full_name", "Unknown")),
                    "employee_code": getattr(emp, "code", None),
                    "total_sales": 0.0,
                    "commission_amount": 0.0,
                    "invoices": []
                }
                if group_by == "MONTH":
                    report_data[group_key]["month_name"] = m_name
                    report_data[group_key]["year"] = y
            
            # Calculate Invoice Total
            inv_net = sum(float(line.quantity * line.rate - (line.discount or 0)) for line in inv.lines)
            
            # Find Matching Rules
            matched_rules = []
            total_rate = 0.0
            post_method = "Auto"
            stored_inc = next((inc for inc in inv.incentives if inc.sales_person_id == emp.id), None)
            
            if stored_inc:
                comm_amt = float(stored_inc.incentive_amount)
                post_method = "Manual" if (stored_inc.is_manual or stored_inc.post_method in ["Manual", "Manual Override"]) else "Auto"
            else:
                total_fixed = 0.0
                total_rate_val = 0.0
                for r in rules:
                    matches = False
                    if r.sales_person_id is not None:
                        if r.sales_person_id != emp.id: continue
                    dept_match = (r.department_id is None) or (r.department_id == eff_dept_id)
                    proj_match = (r.project_id is None) or (r.project_id == eff_project_id)
                    if dept_match and proj_match: matches = True
                    if matches:
                        matched_rules.append({
                            "name": r.name,
                            "ledger_id": r.ledger_id or default_ledger_id,
                            "ledger_name": ledger_names_all.get(r.ledger_id or default_ledger_id) if (r.ledger_id or default_ledger_id) else "Unmapped"
                        })
                        if r.incentive_type.lower() == "fixed": total_fixed += float(r.incentive_value)
                        else: total_rate_val += float(r.incentive_value)
                comm_amt = (inv_net * (total_rate_val / 100.0)) + total_fixed
                total_rate = total_rate_val
                post_method = "Auto"

            report_data[group_key]["total_sales"] += inv_net
            report_data[group_key]["commission_amount"] += comm_amt
            report_data[group_key]["invoices"].append({
                "id": inv.id,
                "date": inv.date,
                "number": inv.reference,
                "voucher_date": inv.voucher.voucher_date if inv.voucher else inv.date,
                "voucher_no": inv.voucher.voucher_number if inv.voucher else inv.reference,
                "post_method": post_method,
                "amount": inv_net,
                "ledger_name": inv.customer.ledger.name if inv.customer and inv.customer.ledger else (inv.customer.name if inv.customer else "-"),
                "remarks": (inv.voucher.narration if inv.voucher and inv.voucher.narration else inv.narration) or "-",
                "rate_applied": total_rate if not stored_inc else 0,
                "commission": comm_amt,
                "rules": matched_rules,
                "project_id": eff_project_id,
                "department_id": eff_dept_id,
                "segment_id": eff_segment_id,
            })

    if group_by == "MONTH":
        sorted_keys = sorted(report_data.keys(), key=lambda x: (x[0], x[1], report_data[x]["employee_name"]))
        return [report_data[k] for k in sorted_keys]
    
    return list(report_data.values())


@router.get("/report")
def get_commission_report(
    company_id: int,
    start_date: date,
    end_date: date,
    sales_person_id: Optional[int] = Query(None),
    ledger_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    segment_id: Optional[int] = Query(None),
    group_by: str = Query("LEDGER"),
    calendar: str = Query("AD"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_company(db, company_id, current_user)
    return _compute_commission_report(
        db=db, company_id=company_id, start_date=start_date, end_date=end_date,
        sales_person_id=sales_person_id, ledger_id=ledger_id, department_id=department_id,
        project_id=project_id, segment_id=segment_id, group_by=group_by, calendar=calendar
    )


@router.get("/report/export")
def export_commission_report(
    company_id: int,
    start_date: date,
    end_date: date,
    format: str = Query("excel"), # excel, html
    sales_person_id: Optional[int] = Query(None),
    ledger_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    segment_id: Optional[int] = Query(None),
    group_by: str = Query("LEDGER"),
    calendar: str = Query("AD"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from app.services.report_exporter import ReportExporter
    
    company = _get_company(db, company_id, current_user)
    report_items = _compute_commission_report(
        db=db, company_id=company_id, start_date=start_date, end_date=end_date,
        sales_person_id=sales_person_id, ledger_id=ledger_id, department_id=department_id,
        project_id=project_id, segment_id=segment_id, group_by=group_by, calendar=calendar
    )

    # Prepare data for exporter
    if group_by == "MONTH":
        headers = ["Year", "Month", "Sales Person", "Total Sales", "Incentive"]
        data = [[p.get("year"), p.get("month_name"), p["employee_name"], p["total_sales"], p["commission_amount"]] for p in report_items]
        total_sales = sum(p["total_sales"] for p in report_items)
        total_comm = sum(p["commission_amount"] for p in report_items)
        total_row = ["GRAND TOTAL", "", "", total_sales, total_comm]
    elif group_by == "LEDGER":
        headers = ["Sales Person", "Total Sales", "Incentive"]
        data = [[p["employee_name"], p["total_sales"], p["commission_amount"]] for p in report_items]
        total_sales = sum(p["total_sales"] for p in report_items)
        total_comm = sum(p["commission_amount"] for p in report_items)
        total_row = ["GRAND TOTAL", total_sales, total_comm]
    else:
        headers = ["Date", "Invoice No.", "Voucher No.", "Sales Person", "Customer", "Net Sales", "Incentive", "Remarks"]
        data = []
        for p in report_items:
            for inv in p["invoices"]:
                data.append([str(inv["date"]), inv["number"], inv["voucher_no"], p["employee_name"], inv["ledger_name"], inv["amount"], inv["commission"], inv["remarks"]])
        total_sales = sum(p["total_sales"] for p in report_items)
        total_comm = sum(p["commission_amount"] for p in report_items)
        total_row = ["GRAND TOTAL", "", "", "", "", total_sales, total_comm, ""]

    summary_data = [
        {"label": "Total Sales", "value": total_sales},
        {"label": "Total Incentive", "value": total_comm}
    ]

    title = f"Sales Incentive Report - {group_by.capitalize()} Wise"
    period = f"{start_date} to {end_date}"
    filename_base = f"sales_incentive_{start_date}_{end_date}"

    if format == "excel":
        return ReportExporter.export_to_excel(
            company.name, title, period, headers, data, summary_data, total_row, f"{filename_base}.xlsx"
        )
    else:
        return ReportExporter.export_to_html(
            company.name, title, period, headers, data, summary_data, total_row, f"{filename_base}.html"
        )
    
    raise HTTPException(400, "Invalid format")

