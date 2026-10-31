WITH yearly AS (
    SELECT
        g.GW_ID,
        g.Year,
        AVG(g.GW_msmt) AS annual_average,
        COUNT(DISTINCT g.Month) AS months_measured
    FROM groundwater AS g
    WHERE g.Year IN (2019, 2025)
      AND g.GW_msmt IS NOT NULL
    GROUP BY g.GW_ID, g.Year
),

site_changes AS (
    SELECT
        a.GW_ID,
        a.annual_average AS average_2019,
        b.annual_average AS average_2025,
        a.months_measured AS months_2019,
        b.months_measured AS months_2025,
        b.annual_average - a.annual_average AS change_value
    FROM yearly AS a
    JOIN yearly AS b
        ON a.GW_ID = b.GW_ID
    WHERE a.Year = 2019
      AND b.Year = 2025
      AND a.months_measured >= 10
      AND b.months_measured >= 10
)

SELECT
    c.GW_ID,
    s.Location,
    s.Watershed,
    s.District,
    ROUND(c.average_2019, 3) AS average_2019,
    ROUND(c.average_2025, 3) AS average_2025,
    c.months_2019,
    c.months_2025,
    ROUND(c.change_value, 3) AS change_value,
    ROUND(ABS(c.change_value), 3) AS absolute_change
FROM site_changes AS c
LEFT JOIN site_info AS s
    ON c.GW_ID = s.GW_ID
ORDER BY absolute_change DESC;
