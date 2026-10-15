from pathlib import Path
import sqlite3
import pandas as pd

project = Path(__file__).resolve().parent.parent
database = project / "groundwater.db"
sql_file = project / "sql" / "08_long_term_trends.sql"
results_dir = project / "results"
results_dir.mkdir(exist_ok=True)

with sqlite3.connect(database) as conn:
    query = sql_file.read_text(encoding="utf-8")
    trends = pd.read_sql_query(query, conn)

output = results_dir / "long_term_trends.csv"
trends.to_csv(output, index=False)

print("\nLONG-TERM GROUNDWATER DEPTH ANALYSIS\n")
print("Sites with qualifying years:", trends["GW_ID"].nunique())
print("Watershed labels:", trends["Watershed"].nunique())

print("\nQUALIFYING YEARS PER SITE\n")
site_summary = (
    trends.groupby(["GW_ID", "Location", "Watershed"])
    .agg(
        qualifying_years=("Year", "nunique"),
        first_year=("Year", "min"),
        last_year=("Year", "max")
    )
    .reset_index()
)

print(
    site_summary.sort_values(
        ["qualifying_years", "GW_ID"],
        ascending=[False, True]
    ).head(25).to_string(index=False)
)

print("\nSITES WITH AT LEAST 6 QUALIFYING YEARS\n")
reliable = site_summary[
    site_summary["qualifying_years"] >= 6
]
print(reliable.to_string(index=False))

print("\nCSV saved to:", output)