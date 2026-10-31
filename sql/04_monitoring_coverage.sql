SELECT
    GW_ID,
    COUNT(*) AS expected_months,
    SUM(CASE WHEN GW_msmt IS NOT NULL THEN 1 ELSE 0 END)
        AS observed_months,
    SUM(CASE WHEN GW_msmt IS NULL THEN 1 ELSE 0 END)
        AS missing_months,
    ROUND(
        100.0 * SUM(
            CASE WHEN GW_msmt IS NOT NULL THEN 1 ELSE 0 END
        ) / COUNT(*), 1
    ) AS coverage_percent,
    COUNT(DISTINCT CASE
        WHEN GW_msmt IS NOT NULL THEN Year
    END) AS years_with_data
FROM raw_groundwater
GROUP BY GW_ID
ORDER BY coverage_percent DESC, GW_ID;