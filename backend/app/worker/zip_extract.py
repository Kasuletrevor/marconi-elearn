from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
import zipfile


class ZipExtractionError(ValueError):
    pass


_ALLOWED_NAMES_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
_ALLOWED_EXTENSIONS = {".c", ".cpp", ".h", ".hpp"}


def _is_symlink(info: zipfile.ZipInfo) -> bool:
    # Unix symlink bit (only reliable when created on Unix).
    is_unix = info.create_system == 3
    if not is_unix:
        return False
    mode = (info.external_attr >> 16) & 0o170000
    return mode == 0o120000


def _validate_member_name(name: str) -> None:
    # Flat only: no directories.
    if "/" in name or "\\" in name:
        raise ZipExtractionError("ZIP must have flat structure (no subdirectories)")
    if name.startswith(("/", "\\")) or name.startswith(".."):
        raise ZipExtractionError("Invalid file path in ZIP")
    if ".." in name:
        raise ZipExtractionError("Invalid file path in ZIP")
    if ":" in name:
        raise ZipExtractionError("Invalid file path in ZIP")

    if name == "Makefile":
        return

    if not _ALLOWED_NAMES_RE.fullmatch(name):
        raise ZipExtractionError("Invalid file name in ZIP")

    ext = Path(name).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise ZipExtractionError("ZIP contains unsupported file types")


@dataclass(frozen=True, slots=True)
class ZipEntry:
    name: str
    size: int


def list_zip_contents(zip_path: Path) -> list[ZipEntry]:
    if not zip_path.exists():
        raise ZipExtractionError("ZIP file missing on server")

    out: list[ZipEntry] = []
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                raise ZipExtractionError("ZIP must have flat structure (no subdirectories)")
            if _is_symlink(info):
                raise ZipExtractionError("ZIP contains symbolic links which are not allowed")
            _validate_member_name(info.filename)
            out.append(ZipEntry(name=info.filename, size=int(info.file_size)))
    return out


def safe_extract_zip(
    zip_path: Path,
    dest_dir: Path,
    *,
    max_files: int = 50,
    max_uncompressed_bytes: int = 10 * 1024 * 1024,
) -> list[Path]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    entries = list_zip_contents(zip_path)
    if len(entries) > max_files:
        raise ZipExtractionError(f"ZIP contains too many files (max {max_files})")
    total = sum(e.size for e in entries)
    if total > max_uncompressed_bytes:
        raise ZipExtractionError("ZIP exceeds maximum size (10MB uncompressed)")

    extracted: list[Path] = []
    with zipfile.ZipFile(zip_path) as zf:
        for entry in entries:
            target = dest_dir / entry.name
            # Extract only regular files, already validated.
            with zf.open(entry.name) as src, target.open("wb") as dst:
                dst.write(src.read())
            extracted.append(target)
    return extracted


def extract_expected_file(
    zip_path: Path,
    filename: str,
    dest_dir: Path,
) -> Path:
    filename = filename.strip()
    if not filename:
        raise ZipExtractionError("Required file name is missing")
    _validate_member_name(filename)
    dest_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path) as zf:
        try:
            info = zf.getinfo(filename)
        except KeyError as exc:
            raise ZipExtractionError(f"Required file '{filename}' not found in ZIP") from exc

        if info.is_dir():
            raise ZipExtractionError("ZIP must have flat structure (no subdirectories)")
        if _is_symlink(info):
            raise ZipExtractionError("ZIP contains symbolic links which are not allowed")

        target = dest_dir / filename
        with zf.open(filename) as src, target.open("wb") as dst:
            dst.write(src.read())
        return target

