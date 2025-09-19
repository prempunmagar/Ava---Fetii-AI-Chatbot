-- Cortex Search Setup for Address Venue Search
-- This enables semantic search on address_line field for venue queries

-- 1. Create Cortex Search Service for Address Venues
CREATE OR REPLACE CORTEX SEARCH SERVICE address_venue_search
ON address_line
WAREHOUSE = CHATAPP_WH  -- Replace with your warehouse
TARGET_LAG = '1 minute'
AS (
  SELECT 
    address_id,
    address_line,
    city,
    state,
    zipcode,
    latitude,
    longitude
  FROM FETII_AI.CHATAPP.DIM_ADDRESS
);

-- 2. Test the Search Service
-- Example queries to test venue search:

-- Search for "Moody Center"
SELECT *
FROM TABLE(
  FETII_AI.CHATAPP.address_venue_search(
    'Moody Center',
    LIMIT => 10
  )
);

-- Search for "campus"
SELECT *
FROM TABLE(
  FETII_AI.CHATAPP.address_venue_search(
    'campus',
    LIMIT => 10
  )
);

-- Search for "downtown"
SELECT *
FROM TABLE(
  FETII_AI.CHATAPP.address_venue_search(
    'downtown',
    LIMIT => 10
  )
);

-- 3. Integration Query Example
-- This shows how to use Cortex Search with trip analysis
SELECT 
  search_results.address_line,
  search_results.city,
  COUNT(f.trip_id) as trip_count,
  AVG(f.total_passengers) as avg_passengers
FROM TABLE(
  FETII_AI.CHATAPP.address_venue_search(
    'Moody Center',  -- User's natural language query
    LIMIT => 5       -- Top 5 matching venues
  )
) search_results
JOIN FETII_AI.CHATAPP.FACT_TRIP f 
  ON f.pickup_address_id = search_results.address_id
     OR f.dropoff_address_id = search_results.address_id
GROUP BY search_results.address_line, search_results.city
ORDER BY trip_count DESC;

-- 4. Check Search Service Status
SHOW CORTEX SEARCH SERVICES;

-- 5. Drop Search Service (if needed for cleanup)
-- DROP CORTEX SEARCH SERVICE address_venue_search;
