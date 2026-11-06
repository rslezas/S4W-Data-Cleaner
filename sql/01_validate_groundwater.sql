
-- S4W Nepal Groundwater Data Validation
-- Purpose: Check the cleaned groundwater dataset
-- before beginning trend analysis.
-- Database: SQLite
-- Table: groundwater

-- 1. Count total groundwater measurements
SELECT COUNT(*) AS total_measurements
FROM groundwater;

-- 2. Count unique groundwater monitoring sites
SELECT COUNT(DISTINCT GW_ID) AS total_sites
FROM groundwater;

-- 3. Check for missing measurements
SELECT COUNT(*) AS missing_measurements
FROM groundwater
WHERE GW_msmt IS NULL;

-- 4. Check for duplicate site-month records
SELECT
    GW_ID,
    Year,
    Month,
    COUNT(*) AS duplicate_count
FROM groundwater
GROUP BY GW_ID, Year, Month
HAVING COUNT(*) > 1;

-- 5. Check number of measurements per year
SELECT
    Year,
    COUNT(*) AS total_measurements,
    COUNT(DISTINCT GW_ID) AS active_sites
FROM groundwater
GROUP BY Year
ORDER BY Year;
