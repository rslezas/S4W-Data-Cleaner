
from pathlib import Path
import sqlite3

project_dir = Path(__file__).resolve().parent.parent
database_file = project_dir / "groundwater.db"

with sqlite3.connect(database_file) as conn:

    print("\nGROUNDWATER DATA VALIDATION\n")

    queries = {
        "Total measurements": """
            SELECT COUNT(*)
            FROM groundwater
        """,

        "Unique monitoring sites": """
            SELECT COUNT(DISTINCT GW_ID)
            FROM groundwater
        """,

        "Missing groundwater measurements": """
            SELECT COUNT(*)
            FROM groundwater
            WHERE GW_msmt IS NULL
        """,

        "Duplicate site-month combinations": """
            SELECT COUNT(*)
            FROM (
                SELECT GW_ID, Year, Month
                FROM groundwater
                GROUP BY GW_ID, Year, Month
                HAVING COUNT(*) > 1
            )
        """
    }

    for label, query in queries.items():
        result = conn.execute(query).fetchone()[0]
        print(f"{label}: {result}")