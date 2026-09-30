# ONS UK mid-2024 demographic evidence

This directory pins the official unified ONS mid-2024 UK population workbook, the matching UK estimates-of-the-very-old CSV, and the release bulletin and QMI. The original filenames and bytes are preserved. `source-manifest.json` records their official locators, byte sizes, retrieval date, Open Government Licence attribution, and SHA-256 checksums.

The workbook release identifier is `MYE24UK`, published 26 September 2025 for the reference date 30 June 2024. The strict adapter uses only `MYE1` and `MYE2 - Persons`, with UK code `K02000001`. The main workbook contains completed ages 0 through 89 and an open `90+` cell. The supplementary CSV is provisional, rounded to the nearest ten, and contains ages 90 through 104 plus an open `105+` cell.

These artifacts establish estimated source evidence. They do not themselves establish a complete PopulationState partition: the 105+ tail remains open, and no production UK Person-generation profile currently exists for operational cohort-to-Person instantiation. The shared calendar now supports possible pre-1900 birth years. Immutable candidate `uk.population.mid-2024.v1` retains its original gap record and fingerprint; changing those semantics requires a successor package rather than mutation in place.

All artifacts are Crown copyright and reused under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). Source: Office for National Statistics, National Records of Scotland, and Northern Ireland Statistics and Research Agency.
