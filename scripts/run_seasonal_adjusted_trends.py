
from pathlib import Path
import sqlite3
import pandas as pd
import numpy as np

project = Path(__file__).resolve().parent.parent
database = project / "groundwater.db"
results_dir = project / "results"
results_dir.mkdir(exist_ok=True)

# Sites selected from earlier trend analysis
sites = ["GW030", "GW062", "GW051", "GW019"]

with sqlite3.connect(database) as conn:
    data = pd.read_sql_query(
        """
        SELECT GW_ID, Year, Month, GW_msmt
        FROM groundwater
        WHERE Year BETWEEN 2017 AND 2025
          AND GW_msmt IS NOT NULL
        """,
        conn
    )

data = data[data["GW_ID"].isin(sites)].copy()
data["GW_msmt"] = pd.to_numeric(
    data["GW_msmt"], errors="coerce"
)
data = data.dropna(subset=["GW_msmt"])

# Use years with at least 10 distinct measured months.
coverage = (
    data.groupby(["GW_ID", "Year"])["Month"]
    .nunique()
    .reset_index(name="months_measured")
)

qualified = coverage[
    coverage["months_measured"] >= 10
][["GW_ID", "Year"]]

data = data.merge(
    qualified, on=["GW_ID", "Year"], how="inner"
)

site_names = {
    "GW030": ("Ekantakuna", "Nakkhu"),
    "GW062": ("Kusunti", "Nakkhu"),
    "GW051": ("Saatdobato", "Nakkhu"),
    "GW019": ("Kritipur Ring Road", "Balkhu")
}

results = []
monthly_outputs = []

for site_id, group in data.groupby("GW_ID"):
    group = group.copy()

    # Average measurements within each site-month.
    group = (
        group.groupby(["GW_ID", "Year", "Month"], as_index=False)
        ["GW_msmt"].mean()
    )

    # Remove each calendar month's typical average.
    # This accounts for recurring seasonal differences.
    group["monthly_baseline"] = (
        group.groupby("Month")["GW_msmt"].transform("mean")
    )

    group["seasonal_anomaly"] = (
        group["GW_msmt"] - group["monthly_baseline"]
    )

    # Fit a line to the seasonally adjusted observations.
    x = group["Year"].to_numpy(dtype=float)
    y = group["seasonal_anomaly"].to_numpy(dtype=float)

    if len(np.unique(x)) < 6:
        continue

    slope, intercept = np.polyfit(x, y, 1)
    predicted = slope * x + intercept

    ss_res = np.sum((y - predicted) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)

    r_squared = (
        1 - ss_res / ss_tot
        if ss_tot > 0 else np.nan
    )

    location, watershed = site_names[site_id]

    results.append({
        "GW_ID": site_id,
        "Location": location,
        "Watershed": watershed,
        "qualifying_years": group["Year"].nunique(),
        "monthly_observations": len(group),
        "first_year": int(group["Year"].min()),
        "last_year": int(group["Year"].max()),
        "adjusted_depth_trend_m_per_year": round(slope, 4),
        "adjusted_r_squared": round(r_squared, 3),
        "direction": (
            "Shallower" if slope < 0
            else "Deeper" if slope > 0
            else "No linear change"
        )
    })

    group["Location"] = location
    group["Watershed"] = watershed
    monthly_outputs.append(group)

summary = pd.DataFrame(results)
summary = summary.sort_values("GW_ID")

summary_file = (
    results_dir / "seasonal_adjusted_site_trends.csv"
)
summary.to_csv(summary_file, index=False)

if monthly_outputs:
    monthly_data = pd.concat(
        monthly_outputs, ignore_index=True
    )
    monthly_data.to_csv(
        results_dir / "seasonal_adjusted_monthly.csv",
        index=False
    )

print("\nSEASONALLY ADJUSTED GROUNDWATER TRENDS\n")
print(summary.to_string(index=False))

print("\nSummary saved to:", summary_file)
print("Monthly results saved in results folder.")