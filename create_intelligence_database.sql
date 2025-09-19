-- CREATE SNOWFLAKE INTELLIGENCE DATABASE AND SCHEMA
-- This creates the required infrastructure for Snowflake Intelligence agents

-- =============================================
-- STEP 1: ENSURE YOU'RE USING ACCOUNTADMIN
-- =============================================
USE ROLE ACCOUNTADMIN;

-- =============================================
-- STEP 2: CREATE SNOWFLAKE_INTELLIGENCE DATABASE
-- =============================================
CREATE DATABASE IF NOT EXISTS SNOWFLAKE_INTELLIGENCE;

-- =============================================  
-- STEP 3: CREATE AGENTS SCHEMA
-- =============================================
USE DATABASE SNOWFLAKE_INTELLIGENCE;
CREATE SCHEMA IF NOT EXISTS AGENTS;

-- =============================================
-- STEP 4: SET PROPER CONTEXT
-- =============================================
USE DATABASE SNOWFLAKE_INTELLIGENCE;
USE SCHEMA AGENTS;

-- =============================================
-- STEP 5: GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant database usage to ACCOUNTADMIN (usually automatic but ensuring)
GRANT USAGE ON DATABASE SNOWFLAKE_INTELLIGENCE TO ROLE ACCOUNTADMIN;
GRANT USAGE ON SCHEMA SNOWFLAKE_INTELLIGENCE.AGENTS TO ROLE ACCOUNTADMIN;

-- Grant create privileges on the schema
GRANT CREATE FUNCTION ON SCHEMA SNOWFLAKE_INTELLIGENCE.AGENTS TO ROLE ACCOUNTADMIN;
GRANT CREATE PROCEDURE ON SCHEMA SNOWFLAKE_INTELLIGENCE.AGENTS TO ROLE ACCOUNTADMIN;

-- Grant warehouse access (replace with your warehouse name if different)
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE ACCOUNTADMIN;

-- =============================================
-- STEP 6: VERIFY SETUP
-- =============================================

-- Check current context
SELECT CURRENT_ROLE() as current_role, 
       CURRENT_DATABASE() as current_database,
       CURRENT_SCHEMA() as current_schema;

-- Verify database exists
SHOW DATABASES LIKE 'SNOWFLAKE_INTELLIGENCE';

-- Verify schema exists  
SHOW SCHEMAS LIKE 'AGENTS' IN DATABASE SNOWFLAKE_INTELLIGENCE;

-- Check permissions
SHOW GRANTS ON DATABASE SNOWFLAKE_INTELLIGENCE;
SHOW GRANTS ON SCHEMA SNOWFLAKE_INTELLIGENCE.AGENTS;

-- =============================================
-- STEP 7: GRANT ACCESS TO YOUR CORTEX SEARCH SERVICE
-- =============================================

-- Grant cross-database access to your search service
GRANT USAGE ON DATABASE FETII_AI TO ROLE ACCOUNTADMIN;
GRANT USAGE ON SCHEMA FETII_AI.CHATAPP TO ROLE ACCOUNTADMIN;
GRANT USAGE ON CORTEX SEARCH SERVICE FETII_AI.CHATAPP.FETII_ADDRESS_SEARCH TO ROLE ACCOUNTADMIN;

-- Also grant select on your dimensional model tables
GRANT SELECT ON TABLE FETII_AI.CHATAPP.DIM_ADDRESS TO ROLE ACCOUNTADMIN;
GRANT SELECT ON TABLE FETII_AI.CHATAPP.DIM_USER TO ROLE ACCOUNTADMIN;
GRANT SELECT ON TABLE FETII_AI.CHATAPP.FACT_TRIP TO ROLE ACCOUNTADMIN;
GRANT SELECT ON TABLE FETII_AI.CHATAPP.FACT_TRIP_RIDERS TO ROLE ACCOUNTADMIN;

-- =============================================
-- STEP 8: TEST CORTEX SEARCH ACCESS
-- =============================================

-- Test that you can access your search service from this context
SELECT * FROM TABLE(
  FETII_AI.CHATAPP.FETII_ADDRESS_SEARCH(
    'moody center',
    LIMIT => 3
  )
);

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'SNOWFLAKE_INTELLIGENCE database and AGENTS schema created successfully!' as setup_status;
