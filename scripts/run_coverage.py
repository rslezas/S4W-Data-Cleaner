from pathlib import Path
import sqlite3
import pandas as pd

# Project file paths
project = Path(__file__).resolve().parent.parent
workbook = project / "Cleaned Data" / "GW_Clean_NEW.xlsx"
database = project / "groundwater.db"
sql_file = project / "sql" / "04_monitoring_coverage.sql"
results_dir = project / "results"

results_dir.mkdir(exist_ok=True)

# Read raw groundwater data
raw = pd.read_excel(workbook, sheet_name="Raw Data")

# Inspect the raw column names
print("Raw Data columns:")
print(raw.columns.tolist())

# Identify monthly measurement columns
month_cols = [
    col for col in raw.columns
    if isinstance(col, str)
    and len(col) == 7
    and col[:4].isdigit()
    and col[4] == "_"
    and col[5:7].isdigit()
]

if not month_cols:
    raise ValueError(
        "No YYYY_MM columns found. Check the raw column names above."
    )

# Convert monthly columns into rows
long_data = raw[["GW_ID"] + month_cols].melt(
    id_vars="GW_ID",
    value_vars=month_cols,
    var_name="year_month",
    value_name="GW_msmt"
)

long_data[["Year", "Month"]] = (
    long_data["year_month"]
    .str.split("_", expand=True)
    .astype(int)
)

long_data = long_data[
    ["GW_ID", "Year", "Month", "GW_msmt"]
]

# Read site information
site_info = pd.read_excel(
    workbook, sheet_name="Site Info"
)

# Import into SQLite and run SQL
with sqlite3.connect(database) as conn:
    long_data.to_sql(
        "raw_groundwater",
        conn,
        if_exists="replace",
        index=False
    )

    site_info.to_sql(
        "site_info",
        conn,
        if_exists="replace",
        index=False
    )

    query = sql_file.read_text(encoding="utf-8")
    coverage = pd.read_sql_query(query, conn)

# Save results
output = results_dir / "monitoring_coverage.csv"
coverage.to_csv(output, index=False)

print("\nMONITORING COVERAGE ANALYSIS\n")
print(f"Sites analyzed: {len(coverage)}")
print(f"Raw monthly cells: {len(long_data)}")
print(
    "Missing monthly cells:",
    long_data["GW_msmt"].isna().sum()
)
print(
    "Sites with data in all 9 years:",
    (coverage["years_with_data"] == 9).sum()
)

print("\n10 SITES WITH LOWEST COVERAGE\n")
print(
    coverage.sort_values("coverage_percent")
    .head(10)
    .to_string(index=False)
)

print(f"\nCSV saved to: {output}")
