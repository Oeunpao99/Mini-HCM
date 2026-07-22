from langchain_core.messages import AIMessage

import app.services.ai_service as ai_service


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_agent_persists_conversation_and_audits_tool_action(client, employee_token, monkeypatch):
    class FakeAzureChatOpenAI:
        def __init__(self, **_kwargs):
            self.tools = []

        def bind_tools(self, tools):
            self.tools = tools
            return self

        def invoke(self, messages):
            if any(message.type == "tool" for message in messages):
                return AIMessage(content="You have no requests right now.")
            return AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "get_my_requests",
                        "args": {"limit": 5},
                        "id": "call_requests",
                    }
                ],
            )

    monkeypatch.setattr("langchain_openai.AzureChatOpenAI", FakeAzureChatOpenAI)
    monkeypatch.setattr(ai_service.settings, "ai_provider", "azure")
    monkeypatch.setattr(ai_service.settings, "azure_openai_api_key", "test-key")
    monkeypatch.setattr(ai_service.settings, "azure_openai_endpoint", "https://example.openai.azure.com")

    response = client.post(
        "/api/ai/chat",
        json={"message": "Show my requests"},
        headers=_auth(employee_token),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["reply"] == "You have no requests right now."
    assert payload["actions"] == [
        {"tool": "get_my_requests", "status": "success", "summary": "Retrieved 0 records"}
    ]

    history = client.get(
        f"/api/ai/conversations/{payload['conversation_id']}/messages",
        headers=_auth(employee_token),
    )
    assert history.status_code == 200
    assert history.json()["messages"] == [
        {"role": "user", "text": "Show my requests"},
        {"role": "assistant", "text": "You have no requests right now."},
    ]


def test_agent_conversation_is_private(client, employee_token, manager_token, monkeypatch):
    monkeypatch.setattr(ai_service.settings, "ai_provider", "mock")

    response = client.post(
        "/api/ai/chat",
        json={"message": "Hello"},
        headers=_auth(employee_token),
    )

    assert response.status_code == 200
    conversation_id = response.json()["conversation_id"]

    history = client.get(
        f"/api/ai/conversations/{conversation_id}/messages",
        headers=_auth(manager_token),
    )
    assert history.status_code == 404


def test_agent_previews_then_confirms_sick_leave(client, employee_token, monkeypatch):
    class FakeAzureChatOpenAI:
        def __init__(self, **_kwargs):
            self.tools = []

        def bind_tools(self, tools):
            self.tools = tools
            return self

        def invoke(self, messages):
            if any(message.type == "tool" for message in messages):
                return AIMessage(content="Your sick leave request preview is ready. Please confirm it.")
            return AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "prepare_request",
                        "args": {
                            "request_type": "leave",
                            "request_date": "2026-07-18",
                            "leave_type": "sick",
                            "reason": "Medical appointment",
                        },
                        "id": "call_prepare_sick_leave",
                    }
                ],
            )

    monkeypatch.setattr("langchain_openai.AzureChatOpenAI", FakeAzureChatOpenAI)
    monkeypatch.setattr(ai_service.settings, "ai_provider", "azure")
    monkeypatch.setattr(ai_service.settings, "azure_openai_api_key", "test-key")
    monkeypatch.setattr(ai_service.settings, "azure_openai_endpoint", "https://example.openai.azure.com")

    response = client.post(
        "/api/ai/chat",
        json={"message": "I need sick leave tomorrow"},
        headers=_auth(employee_token),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "prepare_request"
    assert payload["pending_action"]["preview"]["leave_type"] == "sick"
    assert payload["actions"][0]["status"] == "pending_confirmation"

    requests = client.get("/api/requests/my", headers=_auth(employee_token))
    assert requests.status_code == 200
    assert requests.json() == []

    confirmed = client.post(
        f"/api/ai/actions/{payload['pending_action']['action_id']}/confirm",
        headers=_auth(employee_token),
    )
    assert confirmed.status_code == 200
    requests = client.get("/api/requests/my", headers=_auth(employee_token))
    assert requests.status_code == 200
    assert requests.json()[0]["leave_type"] == "sick"


def test_manager_agent_reads_scoped_staff_information(client, manager_token, monkeypatch):
    class FakeAzureChatOpenAI:
        def __init__(self, **_kwargs):
            self.tools = []

        def bind_tools(self, tools):
            self.tools = tools
            return self

        def invoke(self, messages):
            if any(message.type == "tool" for message in messages):
                return AIMessage(content="Here is the employee's current training and certification summary.")
            return AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "get_staff_information",
                        "args": {"employee_identifier": "EMP001", "include_certifications": True},
                        "id": "call_staff_information",
                    }
                ],
            )

    monkeypatch.setattr("langchain_openai.AzureChatOpenAI", FakeAzureChatOpenAI)
    monkeypatch.setattr(ai_service.settings, "ai_provider", "azure")
    monkeypatch.setattr(ai_service.settings, "azure_openai_api_key", "test-key")
    monkeypatch.setattr(ai_service.settings, "azure_openai_endpoint", "https://example.openai.azure.com")

    response = client.post(
        "/api/ai/chat",
        json={"message": "Show EMP001 certification details"},
        headers=_auth(manager_token),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "get_staff_information"
    assert payload["data"]["employee"]["employee_code"] == "EMP001"
    assert "contact_profile" not in payload["data"]
    assert payload["actions"][0]["status"] == "success"


def test_hr_agent_includes_staff_contact_profile(client, hr_token, monkeypatch):
    class FakeAzureChatOpenAI:
        def __init__(self, **_kwargs):
            self.tools = []

        def bind_tools(self, tools):
            self.tools = tools
            return self

        def invoke(self, messages):
            if any(message.type == "tool" for message in messages):
                return AIMessage(content="Here is the employee profile.")
            return AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "get_staff_information",
                        "args": {"employee_identifier": "EMP001", "include_certifications": False},
                        "id": "call_staff_profile",
                    }
                ],
            )

    monkeypatch.setattr("langchain_openai.AzureChatOpenAI", FakeAzureChatOpenAI)
    monkeypatch.setattr(ai_service.settings, "ai_provider", "azure")
    monkeypatch.setattr(ai_service.settings, "azure_openai_api_key", "test-key")
    monkeypatch.setattr(ai_service.settings, "azure_openai_endpoint", "https://example.openai.azure.com")

    response = client.post(
        "/api/ai/chat",
        json={"message": "Show EMP001 profile"},
        headers=_auth(hr_token),
    )

    assert response.status_code == 200
    contact_profile = response.json()["data"]["contact_profile"]
    assert contact_profile["phone"] == "+855 12 345 678"
    assert contact_profile["personal_email"] == "employee.personal@example.com"
