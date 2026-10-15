from pathlib import Path
import pandas as pd
import numpy as np

project = Path(__file__).resolve().parent.parent

input_file = project / "results" / "long_term_trends.csv"
output_file = project / "results" / "site_trend_slopes.csv"

data = pd.read_csv(input_file)

results = []

for site_id, group in data.groupby("GW_ID"):
    if group["Year"].nunique() < 6:
        continue

    group = group.sort_values("Year")

    years = group["Year"].to_numpy()
    depths = group["average_depth_m"].to_numpy()

    # Calculate the linear trend
    slope, intercept = np.polyfit(years, depths, 1)

    # Predict depth from the fitted trend line
    predicted = slope * years + intercept

    # Calculate R-squared
    ss_res = np.sum((depths - predicted) ** 2)
    ss_tot = np.sum((depths - np.mean(depths)) ** 2)

    r_squared = (
        1 - ss_res / ss_tot
        if ss_tot > 0 else np.nan
    )

    if slope > 0:
        direction = "Increasing depth"
    elif slope < 0:
        direction = "Decreasing depth"
    else:
        direction = "No linear change"

    results.append({
        "GW_ID": site_id,
        "Location": group["Location"].iloc[0],
        "Watershed": group["Watershed"].iloc[0],
        "District": group["District"].iloc[0],
        "qualifying_years": len(group),
        "first_year": int(years.min()),
        "last_year": int(years.max()),
        "depth_change_per_year_m": round(slope, 4),
        "r_squared": round(r_squared, 3),
        "trend_direction": direction
    })

trends = pd.DataFrame(results)

trends["absolute_slope"] = (
    trends["depth_change_per_year_m"].abs()
)

trends = trends.sort_values(
    "absolute_slope", ascending=False
)

trends.to_csv(output_file, index=False)

print("\nGROUNDWATER TRENDS WITH R-SQUARED\n")
print("Sites analyzed:", len(trends))

print("\nLARGEST ESTIMATED ANNUAL CHANGES\n")
print(trends.head(15).to_string(index=False))

print("\nHIGHEST R-SQUARED VALUES\n")
print(
    trends.sort_values("r_squared", ascending=False)
    .head(10).to_string(index=False)
)

print("\nLOWEST R-SQUARED VALUES\n")
print(
    trends.sort_values("r_squared")
    .head(10).to_string(index=False)
)

print("\nCSV saved to:", output_file)
