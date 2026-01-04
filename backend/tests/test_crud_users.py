from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.users import UserEmailTakenError, create_user, get_user, list_users


async def test_create_and_list_users(db: AsyncSession):
    user = await create_user(db, email="test@example.com", password="password123")
    assert user.id > 0
    assert user.email == "test@example.com"
    assert user.password_hash != "password123"

    users = await list_users(db)
    assert len(users) == 1
    assert users[0].email == "test@example.com"


async def test_duplicate_email_returns_conflict(db: AsyncSession):
    await create_user(db, email="dupe@example.com", password="password123")
    try:
        await create_user(db, email="dupe@example.com", password="password456")
        raise AssertionError("Expected UserEmailTakenError")
    except UserEmailTakenError:
        pass


async def test_get_user_by_id(db: AsyncSession):
    user = await create_user(db, email="get@example.com", password="password123")
    fetched = await get_user(db, user_id=user.id)
    assert fetched is not None
    assert fetched.id == user.id
    assert fetched.email == "get@example.com"


async def test_get_nonexistent_user_returns_none(db: AsyncSession):
    fetched = await get_user(db, user_id=999)
    assert fetched is None


async def test_list_users_with_pagination(db: AsyncSession):
    for i in range(5):
        await create_user(db, email=f"user{i}@example.com", password=f"password{i}")

    first_page = await list_users(db, offset=0, limit=2)
    assert len(first_page) == 2
    assert first_page[0].email == "user0@example.com"

    second_page = await list_users(db, offset=2, limit=2)
    assert len(second_page) == 2
    assert second_page[0].email == "user2@example.com"

    all_users = await list_users(db, offset=0, limit=100)
    assert len(all_users) == 5
