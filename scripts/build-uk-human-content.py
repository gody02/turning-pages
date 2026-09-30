"""Build the pinned UK given-name content from official registration artifacts.

This is country-content tooling, not runtime Human logic. It deliberately keeps
source spelling apart except for Unicode NFC and surrounding whitespace.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import pathlib
import unicodedata
import zipfile

import openpyxl


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTENT = ROOT / "src" / "data" / "human" / "uk" / "generation"
ARTIFACTS = CONTENT / "artifacts"
OUTPUT = CONTENT / "compiled-given-names.json"

ONS_HISTORICAL = "names.ons.ew-historical-1904-2024-v1"
ONS_ANNUAL = "names.ons.ew-annual-1996-2024-v1"
NRS_ANNUAL = "names.nrs.scotland-1974-2024-v1"
NISRA_ANNUAL = "names.nisra.ni-1997-2024-v1"
MAX_NAMES_PER_BAND = 250


def normalize_name(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Name must be text")
    result = unicodedata.normalize("NFC", value.strip())
    if not result or result != " ".join(result.split(" ")):
        raise ValueError(f"Invalid source name: {value!r}")
    return result


def name_id(kind: str, display: str) -> str:
    digest = hashlib.sha256(display.encode("utf-8")).hexdigest()[:20]
    return f"human-name.uk.{kind}.{digest}-v1"


def add_count(target: dict[int, dict[str, int]], year: int, name: str, count: int) -> None:
    if count <= 0:
        raise ValueError("Published count must be positive")
    year_counts = target.setdefault(year, {})
    year_counts[name] = year_counts.get(name, 0) + count


def ons_historical() -> dict[int, set[str]]:
    workbook = openpyxl.load_workbook(
        ARTIFACTS / "ons-historical-names-1904-2024.xlsx", read_only=True, data_only=True
    )
    result: dict[int, set[str]] = {}
    for sheet_name in ("Table_1", "Table_2"):
        sheet = workbook[sheet_name]
        years = [int(value) for value in next(sheet.iter_rows(min_row=4, max_row=4, values_only=True))[1:]]
        for row in sheet.iter_rows(min_row=5, max_row=104, values_only=True):
            for year, value in zip(years, row[1:]):
                if year <= 1994:
                    result.setdefault(year, set()).add(normalize_name(value))
    expected = list(range(1904, 1995, 10))
    if sorted(result) != expected or any(len(result[year]) < 150 for year in expected):
        raise ValueError("ONS historical workbook schema mismatch")
    return result


def ons_annual() -> dict[int, dict[str, int]]:
    workbook = openpyxl.load_workbook(
        ARTIFACTS / "ons-baby-names-1996-2024.xlsx", read_only=True, data_only=True
    )
    result: dict[int, dict[str, int]] = {}
    for sheet_name in ("Table_1", "Table_2"):
        sheet = workbook[sheet_name]
        headers = list(next(sheet.iter_rows(min_row=5, max_row=5, values_only=True)))
        columns = [(index, int(str(value).split()[0])) for index, value in enumerate(headers) if isinstance(value, str) and value.endswith(" Count")]
        if [year for _, year in columns] != list(range(2024, 1995, -1)):
            raise ValueError("ONS annual workbook schema mismatch")
        for row in sheet.iter_rows(min_row=6, values_only=True):
            if not isinstance(row[0], str):
                continue
            name = normalize_name(row[0])
            for index, year in columns:
                value = row[index] if index < len(row) else None
                if isinstance(value, int):
                    add_count(result, year, name, value)
                elif value not in (None, "[x]"):
                    raise ValueError(f"Unexpected ONS count marker: {value!r}")
    if sorted(result) != list(range(1996, 2025)):
        raise ValueError("ONS annual year coverage mismatch")
    return result


def nrs_annual() -> dict[int, dict[str, int]]:
    archive = zipfile.ZipFile(ARTIFACTS / "nrs-baby-names-1974-2024.zip")
    if sorted(archive.namelist()) != ["full-list-1974-2024.csv", "metadata.csv"]:
        raise ValueError("NRS archive schema mismatch")
    text = archive.read("full-list-1974-2024.csv").decode("cp1252")
    rows = csv.DictReader(io.StringIO(text))
    if rows.fieldnames != ["Year", "Sex", "Name", "Number", "Rank"]:
        raise ValueError("NRS CSV schema mismatch")
    result: dict[int, dict[str, int]] = {}
    for row in rows:
        year = int(row["Year"])
        if row["Sex"] not in ("Boy", "Girl"):
            raise ValueError("NRS sex-registration category mismatch")
        add_count(result, year, normalize_name(row["Name"]), int(row["Number"]))
    if sorted(result) != list(range(1974, 2025)):
        raise ValueError("NRS annual year coverage mismatch")
    return result


def nisra_annual() -> dict[int, dict[str, int]]:
    workbook = openpyxl.load_workbook(
        ARTIFACTS / "nisra-baby-names-1997-2024.xlsx", read_only=True, data_only=True
    )
    result: dict[int, dict[str, int]] = {}
    for sheet_name in ("Table 1", "Table 2"):
        sheet = workbook[sheet_name]
        headers = list(next(sheet.iter_rows(min_row=5, max_row=5, values_only=True)))
        groups: list[tuple[int, int]] = []
        for index in range(0, 84, 3):
            label = headers[index]
            if not isinstance(label, str) or not label.endswith(" Name"):
                raise ValueError("NISRA workbook schema mismatch")
            groups.append((index, int(label[:4])))
        if [year for _, year in groups] != list(range(1997, 2025)):
            raise ValueError("NISRA annual year coverage mismatch")
        for row in sheet.iter_rows(min_row=6, values_only=True):
            for index, year in groups:
                name = row[index] if index < len(row) else None
                count = row[index + 1] if index + 1 < len(row) else None
                if isinstance(name, str) and isinstance(count, int):
                    add_count(result, year, normalize_name(name), count)
                elif isinstance(name, str) and count == "..":
                    # The source discloses that the name occurred but suppresses
                    # its count below three, so it cannot enter count weighting.
                    continue
                elif name is not None or count is not None:
                    raise ValueError("Unexpected NISRA full-list cell")
    if sorted(result) != list(range(1997, 2025)):
        raise ValueError("NISRA annual year coverage mismatch")
    return result


def support_entries(names: set[str]) -> list[dict[str, object]]:
    return [
        {"id": name_id("given", name), "text": name, "weight": 1}
        for name in sorted(names)
    ]


def counted_entries(start: int, end: int, sources: list[tuple[str, dict[int, dict[str, int]]]]) -> list[dict[str, object]]:
    names = sorted({name for _, annual in sources for year in range(start, end + 1) for name in annual[year]})
    result = []
    for name in names:
        contributions = []
        for source_id, annual in sources:
            count = sum(annual[year].get(name, 0) for year in range(start, end + 1))
            if count:
                contributions.append({"sourceId": source_id, "count": count})
        total = sum(item["count"] for item in contributions)
        result.append(
            {
                "id": name_id("given", name),
                "text": name,
                "weight": total,
                "contributions": contributions,
            }
        )
    return sorted(result, key=lambda item: (-int(item["weight"]), str(item["text"])))[:MAX_NAMES_PER_BAND]


def main() -> None:
    historical = ons_historical()
    ons = ons_annual()
    nrs = nrs_annual()
    nisra = nisra_annual()
    bands: list[dict[str, object]] = []
    windows = [(1906, 1908, 1904)] + [
        (year - 5, year + 4, year) for year in range(1914, 1995, 10)
    ]
    windows[-1] = (1989, 1995, 1994)
    for start, end, evidence_year in windows:
        entries = support_entries(historical[evidence_year])
        bands.append(
            {
                "id": f"human-content.uk.given-{start}-{end}-v1",
                "birthYearFrom": start,
                "birthYearThrough": end,
                "mode": "published-support-uniform",
                "sourceIds": [ONS_HISTORICAL],
                "entries": entries,
                "limitations": [
                    f"Official England-and-Wales top-100 support from {evidence_year} is mapped to {start}-{end}; equal generation weights are an authored selection policy, not historical frequencies.",
                    "The support list is not UK-wide and omits names outside the published top 100 and all frequency information.",
                ],
            }
        )
    support_1996_counts = {
        name: ons[1996].get(name, 0) + nrs[1996].get(name, 0)
        for name in set(ons[1996]) | set(nrs[1996])
    }
    support_1996 = set(
        name for name, _ in sorted(support_1996_counts.items(), key=lambda item: (-item[1], item[0]))[:MAX_NAMES_PER_BAND]
    )
    bands.append(
        {
            "id": "human-content.uk.given-1996-v1",
            "birthYearFrom": 1996,
            "birthYearThrough": 1996,
            "mode": "published-support-uniform",
            "sourceIds": [ONS_ANNUAL, NRS_ANNUAL],
            "entries": support_entries(support_1996),
            "limitations": [
                "Published England-and-Wales and Scotland name support is combined with equal authored selection weights; Northern Ireland has no compatible 1996 full-name artifact in this package.",
                "UK content v1 retains the 250 names with the largest combined published England-and-Wales and Scotland registration counts, then assigns equal authored selection weights.",
                "Published support excludes suppressed names and does not establish UK-wide historical frequencies.",
            ],
        }
    )
    modern_sources = [(ONS_ANNUAL, ons), (NRS_ANNUAL, nrs), (NISRA_ANNUAL, nisra)]
    modern_windows = [(1997, 2001), (2002, 2006), (2007, 2011), (2012, 2016), (2017, 2021), (2022, 2024)]
    for start, end in modern_windows:
        entries = counted_entries(start, end, modern_sources)
        bands.append(
            {
                "id": f"human-content.uk.given-{start}-{end}-v1",
                "birthYearFrom": start,
                "birthYearThrough": end,
                "mode": "registration-count-weighted",
                "sourceIds": [ONS_ANNUAL, NRS_ANNUAL, NISRA_ANNUAL],
                "entries": entries,
                "limitations": [
                    f"Weights sum compatible published registration counts for {start}-{end} across England and Wales, Scotland, and Northern Ireland after combining source sex-registration categories.",
                    "Names registered fewer than three times in a source category are suppressed and are absent; published named mass therefore understates all registrations.",
                    "UK content v1 retains the 250 names with the largest aggregate published count in the evidence window; lower-count published names remain unrepresented content rather than zero-frequency names.",
                    "Registration evidence is identity-facing naming content and is not a demographic, gender-identity, ancestry, ethnicity, religion, or psychology model.",
                ],
            }
        )
    published_mass = {
        f"{start}-{end}": {
            ONS_ANNUAL: sum(sum(ons[year].values()) for year in range(start, end + 1)),
            NRS_ANNUAL: sum(sum(nrs[year].values()) for year in range(start, end + 1)),
            NISRA_ANNUAL: sum(sum(nisra[year].values()) for year in range(start, end + 1)),
        }
        for start, end in modern_windows
    }
    selected_mass = {
        f"{band['birthYearFrom']}-{band['birthYearThrough']}": sum(entry["weight"] for entry in band["entries"])
        for band in bands
        if band["mode"] == "registration-count-weighted"
    }
    output = {
        "version": 1,
        "normalization": "Unicode NFC plus surrounding-whitespace removal; exact remaining code points and capitalization stay distinct.",
        "bands": bands,
        "diagnostics": {
            "publishedNamedMass": published_mass,
            "selectedNamedMass": selected_mass,
            "maximumNamesPerBand": MAX_NAMES_PER_BAND,
            "unrepresentedMass": "unknown: each producer suppresses counts below three and this package does not import independent registration totals",
        },
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size:,} bytes, {len(bands)} bands)")


if __name__ == "__main__":
    main()
