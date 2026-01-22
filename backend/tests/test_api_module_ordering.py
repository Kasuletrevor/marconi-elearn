import pytest


@pytest.mark.asyncio
async def test_modules_reorder_on_insert_and_move(client):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org Modules"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS200", "title": "Data Structures"})
    assert r.status_code == 201
    course_id = r.json()["id"]

    # Seed 6 modules in order.
    module_ids_by_title: dict[str, int] = {}
    for i in range(1, 7):
        title = f"M{i}"
        r = await client.post(
            f"/api/v1/staff/courses/{course_id}/modules",
            json={"title": title, "position": i},
        )
        assert r.status_code == 201
        module_ids_by_title[title] = r.json()["id"]

    # Insert at position 6; the prior "M6" should be pushed to position 7.
    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/modules",
        json={"title": "Structures", "position": 6},
    )
    assert r.status_code == 201
    structures_id = r.json()["id"]

    r = await client.get(f"/api/v1/staff/courses/{course_id}/modules")
    assert r.status_code == 200
    mods = sorted(r.json(), key=lambda m: (m["position"], m["id"]))
    assert len(mods) == 7
    assert len({m["position"] for m in mods}) == 7

    by_pos = {m["position"]: m["title"] for m in mods}
    assert by_pos[6] == "Structures"
    assert by_pos[7] == "M6"

    # Move "M6" back to position 6; it should swap with "Structures".
    m6_id = module_ids_by_title["M6"]
    r = await client.patch(
        f"/api/v1/staff/courses/{course_id}/modules/{m6_id}",
        json={"position": 6},
    )
    assert r.status_code == 200

    r = await client.get(f"/api/v1/staff/courses/{course_id}/modules")
    assert r.status_code == 200
    mods2 = sorted(r.json(), key=lambda m: (m["position"], m["id"]))
    by_pos2 = {m["position"]: m["title"] for m in mods2}
    assert by_pos2[6] == "M6"
    assert by_pos2[7] == "Structures"
    assert any(m["id"] == structures_id for m in mods2)

