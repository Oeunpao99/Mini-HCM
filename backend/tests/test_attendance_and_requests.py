def test_checkin_marks_late_when_after_8am(client, employee_token):
    res = client.post(
        "/api/attendance/checkin",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={
            "latitude": 28.6139,
            "longitude": 77.2090,
            "timestamp": "2026-04-03T08:30:00",
        },
    )
    assert res.status_code == 200
    assert res.json()["is_late"] is True


def test_double_checkin_is_blocked(client, employee_token):
    payload = {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "timestamp": "2026-04-05T07:45:00",
    }
    first = client.post(
        "/api/attendance/checkin",
        headers={"Authorization": f"Bearer {employee_token}"},
        json=payload,
    )
    second = client.post(
        "/api/attendance/checkin",
        headers={"Authorization": f"Bearer {employee_token}"},
        json=payload,
    )
    assert first.status_code == 200
    assert second.status_code == 400


def test_checkout_before_min_time_requires_permission(client, employee_token):
    checkin = client.post(
        "/api/attendance/checkin",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={
            "latitude": 28.6139,
            "longitude": 77.2090,
            "timestamp": "2026-04-06T07:50:00",
        },
    )
    checkout = client.post(
        "/api/attendance/checkout",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={
            "latitude": 28.6139,
            "longitude": 77.2090,
            "timestamp": "2026-04-06T15:00:00",
        },
    )
    assert checkin.status_code == 200
    assert checkout.status_code == 400


def test_request_create_and_manager_approve(client, employee_token, manager_token, hr_token):
    flow_res = client.put(
        "/api/requests/approval-flow",
        headers={"Authorization": f"Bearer {hr_token}"},
        json={"stages": ["line_manager"]},
    )
    assert flow_res.status_code == 200

    create_res = client.post(
        "/api/requests/create",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={
            "type": "leave",
            "date": "2026-04-10",
            "reason": "Medical leave",
        },
    )
    assert create_res.status_code == 200

    request_id = create_res.json()["id"]
    approve_res = client.put(
        "/api/requests/status",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={
            "request_id": request_id,
            "status": "approved",
            "admin_remarks": "Approved",
        },
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"


def test_pending_request_can_be_cancelled(client, employee_token):
    create_res = client.post(
        "/api/requests/create",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={
            "type": "permission",
            "date": "2026-04-12",
            "start_time": "10:00:00",
            "end_time": "12:00:00",
            "reason": "Personal work",
        },
    )
    assert create_res.status_code == 200
    request_id = create_res.json()["id"]

    cancel_res = client.put(
        "/api/requests/cancel",
        headers={"Authorization": f"Bearer {employee_token}"},
        json={"request_id": request_id},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["message"] == "Request cancelled"


def test_manager_requests_employee_movement_and_hr_approves(client, manager_token, hr_token):
    employee_res = client.get(
        "/api/hris/employees",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert employee_res.status_code == 200
    employee_id = employee_res.json()[0]["user_id"]

    create_res = client.post(
        "/api/hris/movement-requests",
        headers={"Authorization": f"Bearer {manager_token}"},
        json={
            "user_id": employee_id,
            "movement_type": "salary_increase",
            "effective_date": "2026-05-01",
            "proposed_salary": 1800,
            "reason": "Strong performance",
        },
    )
    assert create_res.status_code == 200
    request_id = create_res.json()["id"]
    assert create_res.json()["status"] == "pending"

    approve_res = client.put(
        f"/api/hris/movement-requests/{request_id}/review",
        headers={"Authorization": f"Bearer {hr_token}"},
        json={"status": "approved"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    profile_res = client.get(
        "/api/hris/employees",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert profile_res.status_code == 200
    updated = [row for row in profile_res.json() if row["user_id"] == employee_id][0]
    assert updated["basic_salary"] == 1800

    history_res = client.get(
        f"/api/hris/employee-history/{employee_id}",
        headers={"Authorization": f"Bearer {hr_token}"},
    )
    assert history_res.status_code == 200
    assert history_res.json()[0]["event_type"] == "salary_increase"
