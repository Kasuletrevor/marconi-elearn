from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


class TokenCryptoNotConfiguredError(RuntimeError):
    pass


@lru_cache
def _fernet() -> Fernet:
    key = getattr(settings, "token_encryption_key", "").strip()
    if not key:
        raise TokenCryptoNotConfiguredError(
            "TOKEN_ENCRYPTION_KEY must be configured to store third-party tokens"
        )
    try:
        return Fernet(key.encode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise TokenCryptoNotConfiguredError("Invalid TOKEN_ENCRYPTION_KEY format") from exc


def encrypt_token(token: str) -> str:
    return _fernet().encrypt(token.encode("utf-8")).decode("utf-8")


def decrypt_token(token_enc: str) -> str:
    try:
        return _fernet().decrypt(token_enc.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise TokenCryptoNotConfiguredError("Failed to decrypt token") from exc

