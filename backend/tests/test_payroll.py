def _employee_id(client, hr_token):
    res = client.get("/api/hris/employees", headers={"Authorization": f"Bearer {hr_token}"})
    assert res.status_code == 200
    return res.json()[0]["user_id"]


def test_payroll_auto_calculates_totals_and_contributions(client, hr_token):
    user_id = _employee_id(client, hr_token)
    res = client.post(
        "/api/hris/payroll",
        headers={"Authorization": f"Bearer {hr_token}"},
        json={
            "user_id": user_id,
            "period_year": 2026,
            "period_month": 6,
            "basic_salary": 1500,
            "overtime_amount": 0,
            "allowances": 100,
            "bonus": 0,
            "benefits": 0,
            "salary_adjustment": -50,
            "tax_deduction": 0,
            "nssf_deduction": 0,
            "other_deductions": 25,
            "status": "draft",
            "auto_calculate_contributions": True,
        },
    )

    assert res.status_code == 200
    data = res.json()
    assert data["gross_pay"] == 1550
    assert data["tax_deduction"] == 77.5
    assert data["nssf_deduction"] == 30
    assert data["net_pay"] == 1417.5


def test_payroll_approval_publishes_payslip_and_bank_export(client, hr_token, employee_token):
    user_id = _employee_id(client, hr_token)
    create = client.post(
        "/api/hris/payroll",
        headers={"Authorization": f"Bearer {hr_token}"},
        json={
            "user_id": user_id,
            "period_year": 2026,
            "period_month": 7,
            "basic_salary": 1500,
            "allowances": 0,
            "status": "draft",
        },
    )
    assert create.status_code == 200
    record_id = create.json()["id"]

    draft_payslips = client.get("/api/hris/my-payslips", headers={"Authorization": f"Bearer {employee_token}"})
    assert draft_payslips.status_code == 200
    assert draft_payslips.json() == []

    submit = client.post(
        f"/api/hris/payroll/{record_id}/status",
        headers={"Authorization": f"Bearer {hr_token}"},
        json={"status": "submitted"},
    )
    approve = client.post(
        f"/api/hris/payroll/{record_id}/status",
        headers={"Authorization": f"Bearer {hr_token}"},
        json={"status": "approved"},
    )

    assert submit.status_code == 200
    assert approve.status_code == 200
    assert approve.json()["status"] == "approved"

    payslips = client.get("/api/hris/my-payslips", headers={"Authorization": f"Bearer {employee_token}"})
    assert payslips.status_code == 200
    assert payslips.json()[0]["id"] == record_id

    export = client.get(
        "/api/hris/payroll/bank-export?year=2026&month=7",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert export.status_code == 200
    assert "TEST001" in export.text
