
-- S4W Nepal: Yearly Groundwater Analysis
-- Purpose: Examine groundwater measurements
-- and monitoring coverage from 2017 to 2025.

SELECT
    Year,
    ROUND(AVG(GW_msmt), 2) AS average_groundwater,
    ROUND(MIN(GW_msmt), 2) AS minimum_groundwater,
    ROUND(MAX(GW_msmt), 2) AS maximum_groundwater,
    COUNT(*) AS total_measurements,
    COUNT(DISTINCT GW_ID) AS monitoring_sites
FROM groundwater
WHERE GW_msmt IS NOT NULL
GROUP BY Year
ORDER BY Year;
