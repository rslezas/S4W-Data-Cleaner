
from pathlib import Path
import sqlite3
import pandas as pd

# Locate the project folder
project_dir = Path(__file__).resolve().parent.parent

# Locate the SQLite database
database_file = project_dir / "groundwater.db"

# Locate the yearly SQL query
sql_file = project_dir / "sql" / "03_yearly_groundwater.sql"

# Read the SQL code
query = sql_file.read_text(encoding="utf-8")

# Connect to SQLite and execute the query
with sqlite3.connect(database_file) as conn:
    results = pd.read_sql_query(query, conn)

# Display the results
print("\nYEARLY GROUNDWATER ANALYSIS\n")
print(results.to_string(index=False))
