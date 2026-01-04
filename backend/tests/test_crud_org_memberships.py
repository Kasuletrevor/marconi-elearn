from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.organizations import create_organization
from app.crud.org_memberships import (
    OrgMembershipExistsError,
    add_membership,
    delete_membership,
    get_membership,
    list_memberships,
    update_membership,
)
from app.crud.users import create_user
from app.models.organization_membership import OrgRole


async def test_add_and_list_memberships(db: AsyncSession):
    org = await create_organization(db, name="Test Org")
    user = await create_user(db, email="member@example.com", password="password123")

    membership = await add_membership(
        db, organization_id=org.id, user_id=user.id, role=OrgRole.lecturer
    )
    assert membership.id > 0
    assert membership.organization_id == org.id
    assert membership.user_id == user.id
    assert membership.role == OrgRole.lecturer

    memberships = await list_memberships(db, organization_id=org.id)
    assert len(memberships) == 1
    assert memberships[0].user_id == user.id


async def test_duplicate_membership_returns_conflict(db: AsyncSession):
    org = await create_organization(db, name="Test Org")
    user = await create_user(db, email="member@example.com", password="password123")

    await add_membership(db, organization_id=org.id, user_id=user.id, role=OrgRole.lecturer)

    try:
        await add_membership(db, organization_id=org.id, user_id=user.id, role=OrgRole.ta)
        raise AssertionError("Expected OrgMembershipExistsError")
    except OrgMembershipExistsError:
        pass


async def test_get_membership_by_id(db: AsyncSession):
    org = await create_organization(db, name="Test Org")
    user = await create_user(db, email="member@example.com", password="password123")

    membership = await add_membership(
        db, organization_id=org.id, user_id=user.id, role=OrgRole.lecturer
    )

    fetched = await get_membership(db, membership_id=membership.id)
    assert fetched is not None
    assert fetched.id == membership.id
    assert fetched.role == OrgRole.lecturer


async def test_get_nonexistent_membership_returns_none(db: AsyncSession):
    fetched = await get_membership(db, membership_id=999)
    assert fetched is None


async def test_update_membership_role(db: AsyncSession):
    org = await create_organization(db, name="Test Org")
    user = await create_user(db, email="member@example.com", password="password123")

    membership = await add_membership(
        db, organization_id=org.id, user_id=user.id, role=OrgRole.lecturer
    )

    updated = await update_membership(db, membership=membership, role=OrgRole.admin)
    assert updated.role == OrgRole.admin


async def test_delete_membership(db: AsyncSession):
    org = await create_organization(db, name="Test Org")
    user = await create_user(db, email="member@example.com", password="password123")

    membership = await add_membership(
        db, organization_id=org.id, user_id=user.id, role=OrgRole.lecturer
    )

    await delete_membership(db, membership=membership)

    memberships = await list_memberships(db, organization_id=org.id)
    assert len(memberships) == 0


async def test_list_memberships_for_different_orgs(db: AsyncSession):
    org1 = await create_organization(db, name="Org 1")
    org2 = await create_organization(db, name="Org 2")
    user = await create_user(db, email="member@example.com", password="password123")

    await add_membership(db, organization_id=org1.id, user_id=user.id, role=OrgRole.lecturer)
    await add_membership(db, organization_id=org2.id, user_id=user.id, role=OrgRole.ta)

    org1_memberships = await list_memberships(db, organization_id=org1.id)
    assert len(org1_memberships) == 1
    assert org1_memberships[0].role == OrgRole.lecturer

    org2_memberships = await list_memberships(db, organization_id=org2.id)
    assert len(org2_memberships) == 1
    assert org2_memberships[0].role == OrgRole.ta
