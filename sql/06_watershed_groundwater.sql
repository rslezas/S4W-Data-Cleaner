WITH consistent_sites AS (
    SELECT GW_ID
    FROM groundwater
    WHERE Year BETWEEN 2017 AND 2025
      AND GW_msmt IS NOT NULL
    GROUP BY GW_ID
    HAVING COUNT(DISTINCT Year) = 9
),

yearly_site_data AS (
    SELECT
        g.GW_ID,
        g.Year,
        ROUND(AVG(g.GW_msmt), 3) AS average_groundwater,
        COUNT(DISTINCT g.Month) AS months_measured
    FROM groundwater AS g
    JOIN consistent_sites AS c
        ON g.GW_ID = c.GW_ID
    WHERE g.Year BETWEEN 2017 AND 2025
      AND g.GW_msmt IS NOT NULL
    GROUP BY g.GW_ID, g.Year
)

SELECT
    y.GW_ID,
    s.Location,
    s.District,
    s.Watershed,
    s.Latitude,
    s.Longitude,
    y.Year,
    y.average_groundwater,
    y.months_measured,
    ROUND(100.0 * y.months_measured / 12, 1)
        AS coverage_percent

FROM yearly_site_data AS y

LEFT JOIN site_info AS s
    ON y.GW_ID = s.GW_ID

ORDER BY s.Watershed, y.GW_ID, y.Year;