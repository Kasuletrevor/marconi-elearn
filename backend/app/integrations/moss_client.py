"""Wrapper around mosspy for Stanford MOSS plagiarism detection.

Provides an async-friendly interface for submitting C/C++ files
to MOSS and parsing the results page.
"""

from __future__ import annotations

import asyncio
import logging
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

import mosspy

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MossMatch:
    """A single pair match from MOSS results."""

    student_a_filename: str
    student_b_filename: str
    similarity_pct: int
    lines_matched: int
    match_url: str


@dataclass(frozen=True)
class MossResult:
    """Result of a MOSS run."""

    report_url: str
    matches: list[MossMatch]


def _run_moss_sync(
    user_id: str,
    language: str,
    files: list[tuple[str, bytes]],
) -> MossResult:
    """Run MOSS synchronously (to be called in a thread)."""
    m = mosspy.Moss(int(user_id), language)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        for filename, content in files:
            fpath = tmp / filename
            fpath.write_bytes(content)
            m.addFile(str(fpath))

        logger.info("Submitting %d files to MOSS (%s)...", len(files), language)
        report_url = m.send()
        logger.info("MOSS report: %s", report_url)

        if not report_url:
            raise RuntimeError("MOSS returned empty report URL")

        results_dir = tmp / "moss_results"
        results_dir.mkdir()
        m.saveWebPage(str(report_url), str(results_dir / "index.html"))

        matches = _parse_moss_report(results_dir / "index.html")

    return MossResult(report_url=report_url, matches=matches)


def _parse_moss_report(index_html: Path) -> list[MossMatch]:
    """Parse the MOSS HTML results page to extract match pairs."""
    matches: list[MossMatch] = []

    try:
        html = index_html.read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        logger.warning("MOSS results HTML not found at %s", index_html)
        return matches

    row_pattern = re.compile(
        r'<a\s+href="([^"]+)">\s*([^<]+?)\s+\((\d+)%\)\s*</a>',
        re.IGNORECASE,
    )
    all_links = [
        (url, name.strip(), pct)
        for (url, name, pct) in row_pattern.findall(html)
        if re.match(r"user_\d+_", name.strip())
    ]

    i = 0
    while i + 1 < len(all_links):
        url_a, name_a, pct_a = all_links[i]
        _, name_b, pct_b = all_links[i + 1]

        similarity = max(int(pct_a), int(pct_b))
        lines_matched = 0

        lines_pattern = re.compile(
            rf"{re.escape(name_a)}.*?{re.escape(name_b)}.*?<td[^>]*>\s*(\d+)\s*</td>",
            re.IGNORECASE | re.DOTALL,
        )
        lines_match = lines_pattern.search(html)
        if lines_match:
            lines_matched = int(lines_match.group(1))

        matches.append(
            MossMatch(
                student_a_filename=name_a,
                student_b_filename=name_b,
                similarity_pct=similarity,
                lines_matched=lines_matched,
                match_url=url_a,
            )
        )
        i += 2

    return matches


async def submit_to_moss(
    *,
    moss_user_id: str,
    language: str,
    files: list[tuple[str, bytes]],
) -> MossResult:
    """Submit files to MOSS asynchronously."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        _run_moss_sync,
        moss_user_id,
        language,
        files,
    )
