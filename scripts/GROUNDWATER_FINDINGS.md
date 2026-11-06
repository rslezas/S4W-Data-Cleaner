
# Groundwater Data Analysis — Initial Findings

## Project
S4W-Nepal Groundwater Monitoring Analysis

## Data Sources
- GW_Clean.xlsx: Cleaned groundwater measurements
- GW_Clean_NEW.xlsx: Raw monthly measurements and site metadata
- Analysis period: 2017–2025

## 1. Data Validation

The cleaned groundwater dataset contains:
- 3,886 measurements
- 57 monitoring sites
- 9 calendar years (2017–2025)
- 0 missing groundwater measurement values
- 0 duplicate site-year-month combinations

These checks establish basic completeness and uniqueness
within the cleaned measurement records.

## 2. Seasonal Groundwater Patterns

Monthly averages show a recurring seasonal pattern:

- Highest pooled monthly average: April (4.63)
- Lowest pooled monthly average: August (2.69)
- Average measurements decrease from April to August
  and increase again toward December.

Interpretation depends on confirming the measurement
units and whether GW_msmt represents depth to water.

## 3. Yearly Groundwater Patterns

- Highest pooled annual average: 2018 (4.16)
- Lowest pooled annual average: 2025 (3.28)
- Monitoring sites increased from 32 in 2017 to
  55 in 2022 and 2023, then declined to 44 in 2025.

Because monitoring coverage changes over time,
pooled annual averages should not be interpreted
as a definitive long-term groundwater trend.

## 4. Raw Monitoring Coverage

The raw workbook contains:
- 59 monitoring site IDs
- 6,372 possible monthly site entries
- 3,895 populated monthly entries
- 2,477 blank monthly entries
- 61.1% overall coverage across the full grid
- 22 sites with at least one measurement in all nine years

Examples of sites with limited records:
- GW090: 0 of 108 months
- GW085: 9 of 108 months
- GW086: 12 of 108 months
- GW078: 29 of 108 months

Blank entries may reflect inactive sites, incomplete
monitoring, or other data collection limitations.
Site operating periods need verification.

## 5. Data Reconciliation

The raw workbook contains 3,895 populated monthly
entries, while the cleaned dataset contains 3,886
measurement records.

The nine-entry difference should be investigated
before drawing conclusions about data exclusion.

## 6. Recommendations

1. Verify groundwater measurement units and definitions.
2. Confirm when each monitoring site was operational.
3. Reconcile raw and cleaned measurement differences.
4. Compare trends at sites with consistent coverage.
5. Join groundwater measurements to site metadata
   to analyze watershed and geographic differences.
6. Investigate relationships with precipitation data.

## Reproducibility

The repository contains SQL and Python scripts for:
- Groundwater data validation
- Seasonal groundwater summaries
- Yearly groundwater summaries
- Raw monitoring coverage analysis

Monitoring coverage results are exported to:
results/monitoring_coverage.csv

## Long-Term and Seasonally Adjusted Groundwater Trends

Using annual averages from years with at least 10
months of measurements, 25 monitoring sites were
analyzed for long-term trends.

- 15 sites showed decreasing depth trends.
- 10 sites showed increasing depth trends.
- These are descriptive linear trends, not proof
  of statistically significant change.