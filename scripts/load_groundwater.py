from pathlib import Path
import sqlite3
import pandas as pd

# Locate the project folder
project_dir = Path(__file__).resolve().parent.parent

# Locate the cleaned Excel workbook
excel_file = project_dir / "Cleaned Data" / "GW_Clean.xlsx"

# Store the SQLite database locally
database_file = project_dir / "groundwater.db"

# Read the Full Data worksheet
df = pd.read_excel(excel_file, sheet_name="Full Data")

# Import into SQLite
with sqlite3.connect(database_file) as conn:
    df.to_sql(
        "groundwater",
        conn,
        if_exists="replace",
        index=False
    )

print("Groundwater data imported successfully!")
print(f"Total measurements: {len(df)}")
print(f"Unique monitoring sites: {df['GW_ID'].nunique()}")
print(f"Years: {df['Year'].min()} to {df['Year'].max()}")
print(f"Database location: {database_file}")
