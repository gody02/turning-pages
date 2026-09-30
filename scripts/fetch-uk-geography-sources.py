"""One-time fetch helper for the reviewed UK Geography v1 source artifacts.

Runtime and production builds never call this script. The downloaded bytes are
committed and verified by SHA-256 before compiled content is accepted.
"""

from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "src/data/geography/uk/primary-local-admin-2024/artifacts"
ITEM_ID = "f3528c2d6d454edab74f2648cc6a45f6"
SERVICE = (
    "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
    "Local_Authority_Districts_May_2024_Boundaries_UK_BGC/FeatureServer"
)


def fetch(url: str, filename: str) -> None:
    with urlopen(url, timeout=120) as response:
        data = response.read()
    (ARTIFACTS / filename).write_bytes(data)


def main() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    fetch(
        f"https://www.arcgis.com/sharing/rest/content/items/{ITEM_ID}?f=json",
        "ons-lad-may-2024-item.json",
    )
    fetch(f"{SERVICE}/0?f=pjson", "ons-lad-may-2024-layer.json")
    query = urlencode(
        {
            "f": "json",
            "where": "1=1",
            "outFields": "LAD24CD,LAD24NM,LAD24NMW",
            "returnGeometry": "false",
            "orderByFields": "LAD24CD ASC",
        }
    )
    fetch(
        f"{SERVICE}/0/query?{query}",
        "ons-lad-may-2024-attributes.json",
    )


if __name__ == "__main__":
    main()
