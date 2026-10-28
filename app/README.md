## Updated six-file input layout

Place these files in `data/raw/`:

| Water type | Measurements | Station mastersheet |
| --- | --- | --- |
| Groundwater | ground_data.csv | ground_sites.csv |
| Surface water | surface_data.csv | surface_sites.csv |
| Precipitation | precip_data.csv | precip_sites.csv |

Keep the supplied wide-format columns, including `site_id`, `source`,
`msmt_datetime`, `qc_flag` and variable-specific measurement columns.
No conversion to the proposed `station_id,datetime,variable,value` input schema
is required. Preprocessing converts to long format internally. The old combined
CSVs are no longer read. Source aliases in station mastersheets are mapped.

After replacing CSVs, run `python -m scripts.prepare_data`, then start or reload
Streamlit. Prepared outputs from the new files are included for immediate use.

# S4W Nepal — Streamlit Data Portal

A runnable, six-page draft using the supplied the six separate observation and station CSVs.
The archive includes the original CSVs, prepared tables, commented Python code,
page-layout sketches, data contracts, and tests. No hosted service is created.

## Run locally (Windows / macOS / Linux)

Requires Python 3.11 or 3.12. Open a terminal **inside this extracted folder**:

```bash
python -m venv .venv
```

Activate on Windows PowerShell: `.venv\Scripts\Activate.ps1`

Activate on macOS/Linux: `source .venv/bin/activate`

```bash
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

Prepared data is included, so the first launch does not need preprocessing.
To refresh after changing any of the six CSVs or a scientific setting:

```bash
python -m scripts.prepare_data
python -m pytest -q
```

Do not run preprocessing from a page: it is intentionally outside Streamlit.
The cached loader invalidates when `data/processed/audit.json` changes.

## Where to edit

| File | Purpose |
| --- | --- |
| `app.py` | Entry point, navigation and persistent sidebar widgets |
| `views/` | Home, Temporal, Spatial, Integrated, Data & Download, About |
| `portal/config.py` | Units, source mapping, seasons and coverage thresholds |
| `portal/processing.py` | Aggregation, climatology, trends and future tipper adapter |
| `portal/ui.py` | Cached loading, filters, accessible chart/table/download helper |
| `scripts/prepare_data.py` | Validates inputs and prepares tables offline |
| `docs/PAGE_LAYOUT.md` | Page sketches and feature inventory |
| `docs/DATA_CONTRACT.md` | Exact input/output schemas and scientific assumptions |
| `docs/QA.md` | Inspection findings, tests and limitations |
| `data/layers/` | Optional approved WGS84 GeoJSON boundaries |

## Current source-data constraints

- 5,002 input rows; 148 metadata stations. Metadata sources differ from observation
  sources and are explicitly mapped. Station identity is `(source, site_id)`.
- Rainfall is a January–October 2025 sample. Missing accumulation intervals mean
  its sums are **observed amounts**, not validated calendar-day totals. The UI
  does not imply that missing days are dry days.
- Set `CS_DAILY_CONFIRMED = True` only after S4W confirms that each rainfall row
  is a complete local-day amount dated to that day. Multiple rows on one day
  are still not certified; reconcile those upstream before using rain-day counts.
- Temperature is **water temperature**, not air temperature. Monthly/irregular
  observations cannot establish continuous daily temperature extremes.
- Tipping-bucket data and rivers/watersheds/wards are placeholders. The tipper
  transformation functions are implemented and tested on synthetic fixtures,
  but automatic ingestion into the portal is intentionally not enabled.
- Trends and climatologies are calculated only when eligibility checks pass.
  The supplied rainfall does not qualify. These are exploratory statistics,
  not climate normals or evidence of causation.

## Future tipping-bucket integration

1. Read `docs/DATA_CONTRACT.md` and fill `data/raw/tipping_bucket_template.csv`.
2. Add station metadata and approved tipper/CS pairs (template in `data/raw/`).
3. Run the preprocessing command. It produces separate `tipper_*.parquet`
   products: hourly, daily, monthly/seasonal/annual, extremes and diurnal.
4. Extend the long/summary adapter to include those products while preserving
   coverage and period boundaries. Do not simply melt interval rain into the CS
   adapter: that would lose complete-window checks.
5. Enable the currently placeholder dataset and matched-day comparison only
   after source conventions, QC and pairings are confirmed.

## Publishing with GitHub

GitHub stores the code; a Python app host runs Streamlit. Push this project to an
approved repository, retain `requirements.txt`, `.streamlit/config.toml`, `app.py`
and prepared data. Configure your host to run `python -m streamlit run app.py`.
On Streamlit Community Cloud choose the repository and `app.py` as the entrypoint.
Use a private repository/host until S4W approves publication of station locations
and observations. No credentials belong in the repository. The app performs no
writes and has no user-account system. Pin versions after your host's acceptance
checks; `requirements-tested.txt` records the versions tested for this draft.

## Design and accessibility

Light theme, clear units, full widget labels, keyboard-operable controls, visible
empty states, chart tables, CSV exports and map links outside the map. Interactive
HTML charts are self-contained; exported map tiles require internet. Plotly's
camera button exports PNG. No accessibility certification is claimed: complete
manual keyboard, screen-reader and small-screen checks before release.

## Technical references

- Streamlit navigation: https://docs.streamlit.io/develop/api-reference/navigation/st.navigation
- Streamlit caching: https://docs.streamlit.io/develop/api-reference/caching-and-state/st.cache_data
- Streamlit AppTest: https://docs.streamlit.io/develop/api-reference/app-testing/st.testing.v1.apptest
- SciPy Theil–Sen: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html
- Original Mann–Kendall is implemented explicitly in `portal/processing.py`, with
  tie-corrected variance and continuity correction, using annual summaries.
