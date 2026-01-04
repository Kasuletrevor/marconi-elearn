from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.organizations import OrgNameTakenError, create_organization, list_organizations


async def test_create_and_list_organizations(db: AsyncSession):
    org = await create_organization(db, name="My Org")
    assert org.id > 0
    assert org.name == "My Org"

    orgs = await list_organizations(db)
    assert [o.name for o in orgs] == ["My Org"]


async def test_duplicate_org_name_returns_conflict(db: AsyncSession):
    await create_organization(db, name="Dup")
    try:
        await create_organization(db, name="Dup")
        raise AssertionError("Expected OrgNameTakenError")
    except OrgNameTakenError:
        pass
