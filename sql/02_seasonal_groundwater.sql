-- Seasonal Groundwater Analysis
-- Average groundwater measurement by month

SELECT
    Month,
    ROUND(AVG(GW_msmt), 2) AS average_groundwater,
    ROUND(MIN(GW_msmt), 2) AS minimum_groundwater,
    ROUND(MAX(GW_msmt), 2) AS maximum_groundwater,
    COUNT(*) AS total_measurements,
    COUNT(DISTINCT GW_ID) AS monitoring_sites
FROM groundwater
WHERE GW_msmt IS NOT NULL
GROUP BY Month
ORDER BY Month;