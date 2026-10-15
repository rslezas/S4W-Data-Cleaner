
WITH yearly AS (
    SELECT
        g.GW_ID,
        g.Year,
        AVG(g.GW_msmt) AS average_depth,
        COUNT(DISTINCT g.Month) AS months_measured
    FROM groundwater AS g
    WHERE g.Year BETWEEN 2017 AND 2025
      AND g.GW_msmt IS NOT NULL
    GROUP BY g.GW_ID, g.Year
),

qualified_years AS (
    SELECT *
    FROM yearly
    WHERE months_measured >= 10
)

SELECT
    q.GW_ID,
    s.Location,
    s.Watershed,
    s.District,
    q.Year,
    ROUND(q.average_depth, 3) AS average_depth_m,
    q.months_measured,
    ROUND(100.0 * q.months_measured / 12, 1)
        AS coverage_percent

FROM qualified_years AS q

LEFT JOIN site_info AS s
    ON q.GW_ID = s.GW_ID

ORDER BY s.Watershed, q.GW_ID, q.Year;