# Data review and validation

## Supplied data inspection

| Check | Result |
| --- | --- |
| Observation rows | 5,002 |
| Metadata rows / distinct source-qualified keys | 148 / 148 |
| Sources | 2,814 rainfall; 2,086 surface water; 102 groundwater |
| Invalid or timezone-naive timestamps | 0 |
| Excluded QC rows | 21 (nonaccepted QC) |
| Ambiguous duplicate station/time rows quarantined | 4, from two duplicate groups |
| Nonnumeric water-level values converted to missing | 1 |
| Out-of-range pH values excluded | 1 |
| Accepted numeric values in long output | 8,448 |
| Stations with accepted measurements | 93 |
| Metadata-only stations | 55 |
| Missing mapped station coordinates | 0 |
| Prepared summary rows | 21,628 |
| Qualifying station-variable-month climatology rows | 294 |
| Qualifying trend records | 0 |

Duplicate groups: HM09 at 2021-02-23 12:45 Nepal time and KD01 at 2024-05-22
10:12 Nepal time. All four rows remain downloadable for review. The original
CS, SW and GW files are included without alteration in `data/raw/`.

Rainfall covers January 1–October 10, 2025. Surface water covers January 7,
2017–June 1, 2026. Groundwater covers July 2017–December 2025, with four stations
represented in the supplied observation extract. Metadata has more groundwater
stations than the extract. Coordinates alone do not imply observation coverage.

No supplied rainfall record qualifies for climatology or trend analysis. Other
variables have some qualifying calendar-month record climatologies, but no
station-variable series meets the configured annual trend eligibility rules.

## Automated verification

Run `python -m pytest -q` from the project root. Tests cover:

- December–February winter boundaries including leap day.
- Missing rainfall days remain absent, not zero-filled or certified.
- Midnight-ending tipper intervals belong to the prior local day.
- Complete 1/3/24-hour windows and incomplete-window rejection.
- Incomplete months do not become complete tipper totals.
- Duplicate sensor timestamps are rejected.
- Groundwater is not upsampled into hourly or daily values.
- Known linear and tied-constant series for Mann–Kendall and Sen slope.
- Independent reconciliation of all rainfall amounts at each aggregation level.
- Source-qualified observation/metadata joins.
- All six Streamlit pages execute without app exceptions.
- Groundwater, flow and temperature page paths; pair comparisons; empty station
  selections; tipping-bucket placeholder; deep-linked station and empty periods.

The synthetic tipper fixture is generated only inside tests, never bundled as
observational data or displayed in the portal. Preprocessing is run against the
supplied files before packaging. Tested library versions are recorded in
`requirements-tested.txt`.

## Remaining acceptance work

This is a runnable local draft, not a public deployment. Automated AppTest checks
exercise Streamlit's Python/UI model, not a complete browser rendering or a
screen reader. Map tiles, popup navigation from inside the map iframe, mobile
layout and chart image downloads need manual checks in the chosen host/browser.
Folium components and Plotly graphs retain data-table alternatives. Confirm data
licensing, source interval definitions, coordinate publication, and attribution
with S4W before making the portal public. Tipping-bucket real-data ingestion,
pairing and geographic layers remain explicit extension points.
