# Page sketches

All pages share a persistent left sidebar with dataset, variable, stations,
local date range and resolution. Main content flows top to bottom on small screens.
Navigation uses Streamlit pages. Global selections survive navigation; map station
links start or update a selection using a source-qualified station key.

| Page | Top region | Main region | Lower region |
| --- | --- | --- | --- |
| Home | Portal purpose and archive counts | Two-column links to Temporal, Spatial, Integrated and Downloads | Dataset inventory and data limitations |
| Temporal | Title, coverage explanation, line/bar control | Station time series; rainfall boxplots, heatmap and cumulative chart; variable-specific hydrographs/ranges | Climatology, anomalies and eligible MK/Sen statistics |
| Spatial | Monthly/seasonal switch and period slider | Fixed-scale station map; optional GeoJSON and station-location toggles | Accessible value table, station links, map/CSV exports |
| Integrated | Multi-station line chart | Station pair agreement, 1:1 line, bias and RMSE; separate-scale aligned cross-variable panels | Tipper/CS pairing placeholder and required input contract |
| Data & Download | Selection description | Preview, observations, aggregate and metadata CSVs | Audit, quarantined rows, settings and templates |
| About | Project purpose | Interpretation rules, seasons, future tipper integration and accessibility | Expandable schema and layout guides |

## Temporal page sketch by variable

| Variable | Upper chart | Supporting panels |
| --- | --- | --- |
| Rainfall | Observed amount line/bar | Month/season boxplots; year × month heatmap; cumulative observed rainfall; gated rain-day counts |
| Streamflow | Hydrograph | Monthly sample means; sample exceedance curve |
| Groundwater | Monthly depth hydrograph with downward-increasing axis | Difference of consecutive observed seasonal mean depths |
| Water temperature | Sample mean time series | Daily sampled min/mean/max and observation-hour profile |
| Water quality/level | Sample mean time series | Eligible monthly record climatology, anomalies and annual trend |

Chart footer: description → expandable numeric table → CSV and interactive HTML
buttons. The toolbar camera provides PNG. Maps have an equivalent table and text
links for people who cannot use spatial interaction.

## Implemented vs. waiting for source data

| Requirement | Status |
| --- | --- |
| Six pages; cached data; persistent sidebar; empty states | Implemented |
| Rainfall month/season/year observed sums | Implemented; labelled incomplete when coverage is unknown |
| Certified daily rain-day counts (threshold ≥1 mm) | Implemented, gated by source-contract confirmation |
| Tipper 10-min/hourly → daily → month/season/year | Offline functions and templates implemented; UI remains placeholder |
| Tipper max 1/3/24 h and diurnal rainfall | Offline functions implemented; no real input supplied |
| Tipper vs CS matched agreement | Visible placeholder; needs data and explicit paired stations |
| Water-temperature range/diurnal chart | Implemented as sampled statistics with limitations |
| Climatology/anomaly/MK/Sen | Implemented with record-length/coverage guards |
| Rivers, watersheds, wards | Disabled until corresponding real GeoJSON exists |
| Wells and flow-gauge layer toggles | Implemented from supplied metadata |
| Month/season spatial animation | Slider-driven stepping implemented; no timed autoplay |
| Chart and filtered-data downloads | Implemented |

## Extension points

Use separate scripts under `scripts/` for larger data ingestion. Keep the app
read-only. Add a source contract before accepting any new sensor. Set geographic
layer styles and licence/attribution when the sponsor supplies the files.
