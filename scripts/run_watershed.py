from pathlib import Path
import sqlite3
import pandas as pd

project = Path(__file__).resolve().parent.parent

database = project / "groundwater.db"
sql_file = project / "sql" / "06_watershed_groundwater.sql"
results_dir = project / "results"

results_dir.mkdir(exist_ok=True)

with sqlite3.connect(database) as conn:
    query = sql_file.read_text(encoding="utf-8")
    watershed_data = pd.read_sql_query(query, conn)

output = results_dir / "watershed_groundwater.csv"
watershed_data.to_csv(output, index=False)

print("\nGROUNDWATER BY WATERSHED\n")

print("Monitoring sites:", watershed_data["GW_ID"].nunique())
print("Watersheds:", watershed_data["Watershed"].nunique())

print("\nSITES PER WATERSHED\n")
print(
    watershed_data.groupby("Watershed", dropna=False)["GW_ID"]
    .nunique()
    .to_string()
)

print("\nSITES WITHOUT WATERSHED INFORMATION\n")
print(
    watershed_data.loc[
        watershed_data["Watershed"].isna(), "GW_ID"
    ].drop_duplicates().tolist()
)

print("\nFIRST 15 RESULTS\n")
print(watershed_data.head(15).to_string(index=False))

print("\nCSV saved to:", output)