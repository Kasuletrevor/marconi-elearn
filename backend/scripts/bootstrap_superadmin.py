import os

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


async def main() -> None:
    email = os.environ.get("SUPERADMIN_EMAIL")
    password = os.environ.get("SUPERADMIN_PASSWORD")
    if not email or not password:
        raise SystemExit("SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required")

    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email.lower()))
        user = result.scalars().first()
        if user is None:
            user = User(email=email.lower(), password_hash=hash_password(password))
            db.add(user)
        else:
            user.password_hash = hash_password(password)
        await db.commit()

    print(f"Bootstrapped super admin user: {email.lower()}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())

