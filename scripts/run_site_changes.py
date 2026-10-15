from pathlib import Path
import sqlite3
import pandas as pd

project = Path(__file__).resolve().parent.parent
database = project / "groundwater.db"
sql_file = project / "sql" / "07_site_changes.sql"
results_dir = project / "results"

results_dir.mkdir(exist_ok=True)

with sqlite3.connect(database) as conn:
    query = sql_file.read_text(encoding="utf-8")
    changes = pd.read_sql_query(query, conn)

output = results_dir / "site_changes.csv"
changes.to_csv(output, index=False)

print("\nGROUNDWATER SITE CHANGES: 2019 VS 2025\n")
print("Sites meeting coverage requirement:", len(changes))

print("\nLARGEST CHANGES\n")
print(changes.head(15).to_string(index=False))

print("\nWATERSHEDS REPRESENTED\n")
print(
    changes.groupby("Watershed", dropna=False)["GW_ID"]
    .nunique()
    .to_string()
)

print("\nCSV saved to:", output)
