import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture
def client(monkeypatch):
    activities = {
        "Chess Club": {
            "description": "Play chess",
            "schedule": "Fridays",
            "max_participants": 12,
            "participants": ["existing@mergington.edu"],
        }
    }
    monkeypatch.setattr(app_module, "activities", activities)
    with TestClient(app_module.app) as test_client:
        yield test_client


def test_list_activities(client):
    response = client.get("/activities")

    assert response.status_code == 200
    assert response.json()["Chess Club"]["participants"] == ["existing@mergington.edu"]


def test_signup_adds_participant(client):
    response = client.post(
        "/activities/Chess%20Club/signup", params={"email": "new@mergington.edu"}
    )

    assert response.status_code == 200
    assert "new@mergington.edu" in client.get("/activities").json()["Chess Club"]["participants"]


def test_duplicate_signup_is_rejected(client):
    response = client.post(
        "/activities/Chess%20Club/signup", params={"email": "existing@mergington.edu"}
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Student is already signed up"
    assert client.get("/activities").json()["Chess Club"]["participants"] == [
        "existing@mergington.edu"
    ]


def test_unregister_removes_participant_and_allows_signup_again(client):
    email = "existing@mergington.edu"

    response = client.delete("/activities/Chess%20Club/signup", params={"email": email})

    assert response.status_code == 200
    assert client.get("/activities").json()["Chess Club"]["participants"] == []
    assert client.post("/activities/Chess%20Club/signup", params={"email": email}).status_code == 200


@pytest.mark.parametrize("method", ["post", "delete"])
def test_unknown_activity_is_rejected(client, method):
    response = getattr(client, method)(
        "/activities/Unknown/signup", params={"email": "new@mergington.edu"}
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_unknown_participant_is_rejected(client):
    response = client.delete(
        "/activities/Chess%20Club/signup", params={"email": "missing@mergington.edu"}
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up"
    assert client.get("/activities").json()["Chess Club"]["participants"] == [
        "existing@mergington.edu"
    ]
