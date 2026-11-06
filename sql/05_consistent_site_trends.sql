WITH consistent_sites AS (
    SELECT GW_ID
    FROM groundwater
    WHERE Year BETWEEN 2017 AND 2025
      AND GW_msmt IS NOT NULL
    GROUP BY GW_ID
    HAVING COUNT(DISTINCT Year) = 9
)

SELECT
    g.GW_ID,
    g.Year,
    ROUND(AVG(g.GW_msmt), 3) AS average_groundwater,
    ROUND(MIN(g.GW_msmt), 3) AS minimum_groundwater,
    ROUND(MAX(g.GW_msmt), 3) AS maximum_groundwater,
    COUNT(*) AS months_measured

FROM groundwater AS g

JOIN consistent_sites AS c
    ON g.GW_ID = c.GW_ID

WHERE g.Year BETWEEN 2017 AND 2025
  AND g.GW_msmt IS NOT NULL

GROUP BY g.GW_ID, g.Year

ORDER BY g.GW_ID, g.Year;