from __future__ import annotations

from pathlib import Path
import zipfile

import pytest

from app.worker.zip_extract import ZipExtractionError, list_zip_contents, safe_extract_zip


def _make_zip(tmp_path: Path, files: dict[str, bytes]) -> Path:
    zip_path = tmp_path / "submission.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return zip_path


def test_list_zip_contents_rejects_nested_paths(tmp_path: Path) -> None:
    zip_path = _make_zip(tmp_path, {"src/main.c": b"int main(){return 0;}\n"})
    with pytest.raises(ZipExtractionError):
        list_zip_contents(zip_path)


def test_list_zip_contents_rejects_path_traversal(tmp_path: Path) -> None:
    zip_path = _make_zip(tmp_path, {"../evil.c": b"int main(){return 0;}\n"})
    with pytest.raises(ZipExtractionError):
        list_zip_contents(zip_path)


def test_safe_extract_zip_enforces_max_files(tmp_path: Path) -> None:
    files = {f"f{i}.c": b"int main(){return 0;}\n" for i in range(51)}
    zip_path = _make_zip(tmp_path, files)
    with pytest.raises(ZipExtractionError):
        safe_extract_zip(zip_path, tmp_path / "out", max_files=50)


def test_safe_extract_zip_extracts_files(tmp_path: Path) -> None:
    zip_path = _make_zip(
        tmp_path,
        {
            "main.c": b"#include \"utils.h\"\nint main(){return util();}\n",
            "utils.h": b"int util(void);\n",
        },
    )
    out_dir = tmp_path / "out"
    extracted = safe_extract_zip(zip_path, out_dir)
    assert {p.name for p in extracted} == {"main.c", "utils.h"}
    assert (out_dir / "main.c").exists()
    assert (out_dir / "utils.h").exists()

