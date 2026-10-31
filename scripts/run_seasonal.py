from pathlib import Path
import sqlite3
import pandas as pd

project_dir = Path(__file__).resolve().parent.parent

database_file = project_dir / "groundwater.db"
sql_file = project_dir / "sql" / "02_seasonal_groundwater.sql"

# Read the SQL query
query = sql_file.read_text(encoding="utf-8")

# Run it against the database
with sqlite3.connect(database_file) as conn:
    results = pd.read_sql_query(query, conn)

print("\nSEASONAL GROUNDWATER ANALYSIS\n")
print(results.to_string(index=False))
