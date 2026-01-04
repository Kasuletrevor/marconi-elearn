import pytest


@pytest.mark.asyncio
async def test_orgs_crud(client):
    await client.get("/api/v1/health")

    await client.post(
        "/api/v1/orgs",
        json={"name": "Org A"},
    )
    r = await client.get("/api/v1/orgs")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    org_id = data[0]["id"]

    r = await client.patch(f"/api/v1/orgs/{org_id}", json={"name": "Org B"})
    assert r.status_code == 200
    assert r.json()["name"] == "Org B"

    r = await client.delete(f"/api/v1/orgs/{org_id}")
    assert r.status_code == 204
