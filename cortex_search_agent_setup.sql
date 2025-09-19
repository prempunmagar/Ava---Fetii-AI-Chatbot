-- CORTEX SEARCH + ANALYST AGENT SETUP
-- Creates an intelligent agent that combines venue search with analytics

-- ===============================================
-- 1. CREATE CORTEX SEARCH SERVICE FOR ADDRESSES
-- ===============================================
CREATE OR REPLACE CORTEX SEARCH SERVICE FETII_ADDRESS_SEARCH
ON address_line, city, state
WAREHOUSE = COMPUTE_WH
TARGET_LAG = '1 minute'  
AS (
  SELECT 
    address_id,
    address_line,
    city,
    state,
    zipcode,
    latitude,
    longitude,
    -- Add searchable text combinations
    address_line || ', ' || city AS full_address,
    CASE 
      WHEN address_line ILIKE '%campus%' THEN 'campus university'
      WHEN address_line ILIKE '%downtown%' OR address_line ILIKE '%6th%' THEN 'downtown center'  
      WHEN address_line ILIKE '%moody%' THEN 'moody center arena'
      ELSE address_line 
    END AS search_tags
  FROM FETII_AI.CHATAPP.DIM_ADDRESS
);

-- ===============================================  
-- 2. AGENT HELPER FUNCTIONS
-- ===============================================

-- Function 1: Smart Venue Search
CREATE OR REPLACE FUNCTION find_venues(search_term STRING)
RETURNS TABLE (
  address_id NUMBER,
  address_line STRING,
  city STRING,
  match_score FLOAT
)
AS $$
  SELECT 
    address_id,
    address_line,
    city,
    -- Cortex Search returns relevance score
    GET(search_result, 'score')::FLOAT as match_score
  FROM TABLE(
    FETII_AI.CHATAPP.FETII_ADDRESS_SEARCH(
      search_term,
      LIMIT => 10,
      FILTER => {}
    )
  ) search_result
  WHERE GET(search_result, 'score')::FLOAT > 0.7  -- Only high-confidence matches
$$;

-- Function 2: Venue Trip Analytics  
CREATE OR REPLACE FUNCTION analyze_venue_trips(venue_search STRING, time_filter STRING DEFAULT 'all')
RETURNS TABLE (
  venue_name STRING,
  pickup_trips NUMBER,
  dropoff_trips NUMBER, 
  total_trips NUMBER,
  avg_passengers FLOAT,
  popular_hours STRING
)
AS $$
  WITH venue_matches AS (
    SELECT address_id, address_line as venue_name
    FROM TABLE(find_venues(venue_search))
  ),
  trip_stats AS (
    SELECT 
      v.venue_name,
      COUNT(CASE WHEN f.pickup_address_id = v.address_id THEN 1 END) as pickup_trips,
      COUNT(CASE WHEN f.dropoff_address_id = v.address_id THEN 1 END) as dropoff_trips,
      COUNT(*) as total_trips,
      AVG(f.total_passengers) as avg_passengers,
      MODE(f.hour_of_day) as popular_hour
    FROM venue_matches v
    JOIN FETII_AI.CHATAPP.FACT_TRIP f 
      ON (f.pickup_address_id = v.address_id OR f.dropoff_address_id = v.address_id)
    WHERE CASE 
      WHEN time_filter = 'week' THEN f.trip_date >= CURRENT_DATE - 7
      WHEN time_filter = 'month' THEN f.trip_date >= CURRENT_DATE - 30  
      ELSE TRUE 
    END
    GROUP BY v.venue_name
  )
  SELECT 
    venue_name,
    pickup_trips,
    dropoff_trips,
    total_trips,
    ROUND(avg_passengers, 2) as avg_passengers,
    popular_hour || ':00' as popular_hours
  FROM trip_stats
  ORDER BY total_trips DESC
$$;

-- ===============================================
-- 3. AGENT QUERY ROUTER LOGIC  
-- ===============================================

-- Function 3: Intelligent Query Router
CREATE OR REPLACE FUNCTION route_user_query(user_question STRING)
RETURNS STRING
AS $$
  CASE
    -- Venue-specific questions → Use Search + Analytics
    WHEN user_question ILIKE '%moody%center%' 
      OR user_question ILIKE '%campus%' 
      OR user_question ILIKE '%downtown%'
      OR user_question ILIKE '%venue%'
      OR user_question ILIKE '%location%'
      OR user_question ILIKE '%place%' THEN 'VENUE_SEARCH'
    
    -- Pure analytics questions → Use Cortex Analyst  
    WHEN user_question ILIKE '%average%'
      OR user_question ILIKE '%total%trips%'
      OR user_question ILIKE '%by%day%'
      OR user_question ILIKE '%demographics%' 
      OR user_question ILIKE '%age%group%' THEN 'ANALYTICS'
    
    -- Combined questions → Use Both
    WHEN user_question ILIKE '%trips%to%' 
      OR user_question ILIKE '%popular%pickup%'
      OR user_question ILIKE '%busiest%destination%' THEN 'COMBINED'
      
    -- Default to Analytics
    ELSE 'ANALYTICS'
  END
$$;

-- ===============================================
-- 4. TEST QUERIES
-- ===============================================

-- Test 1: Pure venue search
SELECT 'Testing venue search...' as test_type;
SELECT * FROM TABLE(find_venues('moody center'));
SELECT * FROM TABLE(find_venues('campus'));

-- Test 2: Venue analytics
SELECT 'Testing venue analytics...' as test_type;  
SELECT * FROM TABLE(analyze_venue_trips('moody center', 'all'));

-- Test 3: Query routing
SELECT 'Testing query router...' as test_type;
SELECT route_user_query('How many trips went to Moody Center?') as route_result;
SELECT route_user_query('What are the average passengers by age group?') as route_result;

-- ===============================================
-- 5. MANAGEMENT COMMANDS
-- ===============================================

-- Check search service status
SHOW CORTEX SEARCH SERVICES LIKE '%ADDRESS%';

-- Refresh search index (if needed)
-- ALTER CORTEX SEARCH SERVICE FETII_ADDRESS_SEARCH REFRESH;

-- Monitor search service
-- SELECT * FROM TABLE(INFORMATION_SCHEMA.CORTEX_SEARCH_SERVICES());

-- Drop service (cleanup only)
-- DROP CORTEX SEARCH SERVICE FETII_ADDRESS_SEARCH;
