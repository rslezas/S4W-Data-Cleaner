# Data input/output contract

## Observation input: `data/raw/ground_data.csv`, `surface_data.csv`, `precip_data.csv`

One row is a source observation, potentially containing several measured variables.
UTF-8 CSV, header row, decimal point numeric values, blanks for unknown values.

| Column | Required | Type and meaning |
| --- | --- | --- |
| site_id | Yes | String, preserve leading zeros; not globally unique |
| source | Yes | String: cs_precip_sample, sw_database or gw_database |
| msmt_datetime | Yes | ISO 8601 with explicit offset, e.g. 2025-06-01 08:00:00+05:45 |
| qc_flag | Yes | CheckedGood or CheckedCorrected accepted; other values excluded |
| precip_mm | For rainfall | Nonnegative observed accumulated amount in mm |
| gw_depth_m | For groundwater | Depth in m; source reference/sign must be confirmed |
| water_flow_cms | For flow | Nonnegative flow in m³/s |
| wq_temp_c | For temperature | Water temperature in °C; not air temperature |
| wq_ec_uscm | Optional | Nonnegative conductivity in µS/cm |
| wq_tds_ppm | Optional | Nonnegative dissolved solids in ppm |
| wq_ph | Optional | Numeric pH from 0 to 14 |
| water_level_m | Optional | Numeric water level in m; datum is source-specific |
| latitude, longitude | Coordinate fallback | WGS84 decimal degrees |
| elevation | Optional | Source elevation, not used as a water-level datum |

All accepted times are converted to Asia/Kathmandu and stored as naive local
wall-clock datetimes in prepared tables. Consumers must not interpret these as
UTC. Original offset-bearing inputs remain unchanged in `data/raw/`.

The groundwater source is treated as monthly observations because it supplies
first-of-month timestamps and a monthly database convention. Hourly/daily
upsampling is suppressed. Confirm this convention when replacing the input.

Do not sum cumulative gauge readings or overlapping accumulation intervals.
The supplied rainfall file lacks interval start/end fields; amounts are therefore
assigned to the collection date for **observed sums only**. No multi-day interval
allocation is attempted. Negative/malformed/nonfinite numeric values are nulled
where physically invalid; negative level/depth values are retained because datums
may permit them. Invalid pH is excluded. Exact station/time duplicate groups are
quarantined in full, including their other variables, pending reconciliation.

## Station input: `data/raw/ground_sites.csv`, `surface_sites.csv`, `precip_sites.csv`

One row per source-qualified station. Required: site_id, source, latitude,
longitude. Optional source fields retained: name, project, records, watershed,
elevation, start_date, end_date, timestep.

| Metadata source | Observation source |
| --- | --- |
| s4w_nepal_v1.6 | cs_precip_sample |
| Flow_SW_DB | sw_database |
| GW New Database | gw_database |

`station_key = source + "::" + site_id` after mapping. Do not join on site_id alone.
All 148 metadata stations remain in the archive even when no observations were
supplied. Metadata counts/start/end are not treated as authoritative data coverage.
Coordinates use station metadata first, then median observed coordinates if absent.
Invalid lat/lon pairs are omitted from maps. Coordinate movement is not modelled.

## Prepared outputs (`data/processed/`)

| Output | Row grain | Main fields |
| --- | --- | --- |
| observations.parquet | One accepted variable measurement | station_key, source, site_id, time, qc_flag, variable, value |
| stations.parquet | One source-qualified station | Original metadata, original_source, mapped source, station_key, valid_values |
| summary.parquet | Station × variable × resolution × period | Fields defined below |
| climatology.parquet | Station × variable × calendar month | climatology, baseline_years, baseline_start, baseline_end |
| anomalies.parquet | Qualifying station-month observation | Monthly fields, baseline fields, anomaly |
| trends.parquet | Eligible station × variable | years, first_year, last_year, mk_p, sen_per_year, slope_low, slope_high |
| diurnal.parquet | Station × local observation hour | Water-temperature sample mean and count |
| duplicate_rows.csv | Quarantined original observation rows | Input columns plus time and station_key |
| audit.json | Build report | QC counts, coercions, missing coordinates, source hashes, build timestamp |

### Summary fields

- `resolution`: Hourly, Daily, Monthly, Seasonal, Annual. No CS hourly rain or
  groundwater hourly/daily records are produced.
- `period_start`, `period_end`: local half-open bounds [start, end).
- `value`: rainfall observed sum; all other variables arithmetic sample mean.
- `mean`, `minimum`, `maximum`, `observed_sum`: statistics of available values.
  `observed_sum` is meaningful as an accumulated amount only for rainfall.
- `n_observations`, `observed_days`: accepted value count and distinct dates.
- `expected_days`: calendar period duration (hourly = 1/24 day).
- `day_presence_fraction`: dates with observations / calendar days, clipped to 1.
  This is **not measurement coverage** for irregular or subdaily sampling.
- `certified_days`: for opted-in CS daily totals, dates with exactly one row.
- `coverage`: certified CS days / expected days only when the daily contract is
  confirmed; otherwise NaN. No unknown period is presented as complete.
- `rain_days`: observed certified days ≥1 mm; NaN before certification. Even after
  certification this is an observed count, not a gap-filled whole-period count.
- `observed_rain_dates`: distinct collection dates with an individual observation
  ≥1 mm. This is not a standard rain-day count and is not displayed as one.
- `season`: Winter (Dec–Feb), Pre-monsoon (Mar–May), Monsoon (Jun–Sep), Post-monsoon
  (Oct–Nov). `season_year`: year of January/February for winter.
- `statistic`: human-readable aggregation label.

Missing periods are omitted, never zero-filled. Within the date filter, only whole
calendar periods are returned. For example, selecting June 15–July 20 returns no
monthly period; choose daily resolution or widen the filter. Missing source data
inside an included period still produce an observed sum/sample mean and counts.
Charts connect available points and state this explicitly; no interpolation is
used in calculations. Cumulative rainfall adds observed amounts only.

### Climatology and trend eligibility

The fixed baseline is the full prepared record, separate from the display date
filter. Monthly climatology requires at least five different years for a calendar
month. Rainfall months additionally need certified daily coverage ≥80%; amounts
are never extrapolated. Therefore even eligible rainfall statistics may retain
some missing-day bias. For other variables these are sample-mean climatologies,
not time-weighted means, and sampling bias remains possible.

Anomaly = monthly value − qualifying calendar-month record mean. This is an
exploratory record reference, not a standard 30-year normal.

Trends use annual values derived from monthly values, with equal weight per month
for nonrain variables. At least 8 observed months/year and 10 qualifying years are
required. Rain uses annual summed monthly amounts with 12 qualified months/year.
Mann–Kendall: original two-sided test, tie-adjusted variance, continuity correction.
Sen slope: median pairwise slopes with actual calendar-year gaps; SciPy 95% slope
interval. Serial correlation, sampling bias and multiple tests are not corrected.
No result should be treated as a definitive climate trend.

### Streamflow, groundwater and temperature

Flow-duration curves use descending samples and exceedance = rank/(n+1). This is
sample exceedance; irregular spot readings do not estimate continuous time
exceedance. Monthly flow is an arithmetic sample mean, not time-weighted runoff.
Groundwater seasonal change subtracts consecutive seasonal sample means; missing
seasons break the comparison. Depth axes increase downward. Water-temperature
min/mean/max describe samples only. Hour-of-day means are sampling profiles and
can be confounded by seasonal sampling. No air-temperature estimate is made.

## Future tipping-bucket input

`data/raw/tipping_bucket_template.csv` is header-only by design:

```csv
site_id,timestamp,precip_mm,interval_minutes
```

Every row must be a QC-approved **interval amount**, not cumulative counter or
mm/hour rate. Timestamp is interval END with explicit timezone offset. Cadence is
10 or 60 minutes, constant per station, aligned to local midnight. Ten-minute
local bin ends are :00/:10/:20/:30/:40/:50, with zero seconds. Explicit 0 means a
valid dry interval; absent rows mean missing. No duplicates or negative amounts.
The adapter shifts interval end to start, so a midnight-ending amount belongs to
the previous local day. Station metadata and source QC must be validated upstream.

`tipper_hourly.parquet` and `tipper_daily.parquet`: station_key, period_start,
observed_sum, count, coverage, value. `value` exists only for complete bins.
`tipper_summary.parquet`: month/season/year period bounds, observed_sum,
complete_days, expected_days, coverage, rain_days, value; full `value` requires
100% complete days. Observed rain-day count uses only complete daily bins.
`tipper_extremes.parquet`: full-record station maxima for rolling 1/3/24-hour
amounts (mm) and corresponding mean intensities (mm/hour). Windows require every
expected interval and may cross midnight. Maxima are interval-grid aligned, not
arbitrary subinterval storm maxima.
`tipper_diurnal.parquet`: local hour, mean_mm, n_complete_hours, station_key.
Only complete hours contribute. These are separate offline outputs; the current
portal keeps a placeholder until an approved integrated adapter is added.

Use `station_pairs_template.csv` for approved tipper/CS pairings. Pair by geography
and collection convention, never by similar ID or row order. Agreement requires
matched local dates with sufficient coverage in both sources.

## Optional geographic inputs

`data/layers/rivers.geojson`, `watersheds.geojson`, `wards.geojson`: WGS84 GeoJSON
FeatureCollections, coordinates [longitude, latitude]. Include suitable attribution
and permission information before publishing. Unavailable layers remain disabled.
No fake boundaries or station positions are included.

## Download outputs

CSV is UTF-8 with BOM, header row, blank missing numeric values, numeric types
preserved and explicit units in filtered exports. HTML charts embed Plotly and
work offline; map basemap tiles require internet. Chart PNG is exported through
the Plotly camera. `filter_settings.json` captures the source, stations, variable,
dates and resolution; `audit.json` identifies source-file hashes and build time.
