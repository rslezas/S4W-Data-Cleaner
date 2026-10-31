from pathlib import Path
import sqlite3
import pandas as pd

project = Path(__file__).resolve().parent.parent

database = project / "groundwater.db"
sql_file = project / "sql" / "05_consistent_site_trends.sql"
results_dir = project / "results"

results_dir.mkdir(exist_ok=True)

with sqlite3.connect(database) as conn:
    query = sql_file.read_text(encoding="utf-8")
    trends = pd.read_sql_query(query, conn)

output = results_dir / "consistent_site_trends.csv"
trends.to_csv(output, index=False)

print("\nCONSISTENT SITE GROUNDWATER TRENDS\n")

print("Sites analyzed:", trends["GW_ID"].nunique())
print("Years analyzed:", trends["Year"].nunique())

print("\nFIRST 15 RESULTS\n")
print(trends.head(15).to_string(index=False))

print("\nMONTHLY COVERAGE SUMMARY\n")
print(trends["months_measured"].describe().to_string())

print("\nCSV saved to:", output)
