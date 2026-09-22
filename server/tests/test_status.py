import os

os.environ["API_KEY"] = "test-key"

import pytest
from fastapi.testclient import TestClient

from app.main import app

URL = "/api/v1/status"


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_rejects_missing_key(client):
    assert client.get(URL).status_code == 401


def test_rejects_wrong_key(client):
    assert client.get(URL, headers={"X-API-Key": "nope"}).status_code == 401


def test_rejects_non_ascii_key(client):
    assert client.get(URL, headers={"X-API-Key": b"cl\xe9"}).status_code == 401


def test_reports_usage(client):
    response = client.get(URL, headers={"X-API-Key": "test-key"})
    assert response.status_code == 200
    body = response.json()
    assert body["hostname"]
    assert body["uptime_seconds"] > 0
    assert body["cpu"]["cores"] >= 1
    assert len(body["cpu"]["load_average"]) == 3
    for section in ("cpu", "memory", "disk"):
        assert 0 <= body[section]["percent"] <= 100
    for section in ("memory", "disk"):
        assert 0 < body[section]["used"] <= body[section]["total"]
