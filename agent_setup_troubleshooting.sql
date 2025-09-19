-- SNOWFLAKE AGENT SETUP TROUBLESHOOTING
-- Fix permissions and schema issues for creating agents

-- =============================================
-- STEP 1: CHECK CURRENT CONTEXT
-- =============================================
SELECT CURRENT_ROLE() as current_role, 
       CURRENT_DATABASE() as current_database,
       CURRENT_SCHEMA() as current_schema;

-- Check if schema exists
SHOW SCHEMAS LIKE 'CHATAPP' IN DATABASE FETII_AI;

-- =============================================
-- STEP 2: CREATE SCHEMA IF IT DOESN'T EXIST
-- =============================================
-- Run this if schema doesn't exist
CREATE SCHEMA IF NOT EXISTS FETII_AI.CHATAPP;

-- =============================================
-- STEP 3: SWITCH TO ACCOUNTADMIN (if not already)
-- =============================================
USE ROLE ACCOUNTADMIN;
USE DATABASE FETII_AI;
USE SCHEMA CHATAPP;

-- =============================================
-- STEP 4: GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant CREATE CORTEX SEARCH SERVICE privilege (if needed)
GRANT CREATE CORTEX SEARCH SERVICE ON SCHEMA FETII_AI.CHATAPP TO ROLE ACCOUNTADMIN;

-- Grant permissions to create functions and procedures
GRANT CREATE FUNCTION ON SCHEMA FETII_AI.CHATAPP TO ROLE ACCOUNTADMIN;
GRANT CREATE PROCEDURE ON SCHEMA FETII_AI.CHATAPP TO ROLE ACCOUNTADMIN;

-- Grant usage on warehouse
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE ACCOUNTADMIN;

-- =============================================
-- STEP 5: CHECK CORTEX SEARCH SERVICE EXISTS
-- =============================================
SHOW CORTEX SEARCH SERVICES IN SCHEMA FETII_AI.CHATAPP;

-- =============================================
-- STEP 6: CREATE AGENT-READY SETUP
-- =============================================

-- First, let's create a simple stored procedure for the agent
CREATE OR REPLACE PROCEDURE create_rideshare_agent()
RETURNS STRING
LANGUAGE SQL
AS
$$
BEGIN
    RETURN 'Rideshare agent setup completed successfully';
END;
$$;

-- Test the procedure
CALL create_rideshare_agent();

-- =============================================
-- STEP 7: ALTERNATIVE - CREATE AGENT WITH SYSADMIN
-- =============================================
-- If ACCOUNTADMIN still doesn't work, try SYSADMIN

USE ROLE SYSADMIN;
USE DATABASE FETII_AI;
USE SCHEMA CHATAPP;

-- Grant permissions to SYSADMIN for agent creation
USE ROLE ACCOUNTADMIN;
GRANT CREATE FUNCTION ON SCHEMA FETII_AI.CHATAPP TO ROLE SYSADMIN;
GRANT CREATE PROCEDURE ON SCHEMA FETII_AI.CHATAPP TO ROLE SYSADMIN;
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE SYSADMIN;

-- Switch back to SYSADMIN
USE ROLE SYSADMIN;

-- =============================================
-- STEP 8: CREATE CUSTOM ROLE FOR AGENTS (Recommended)
-- =============================================
USE ROLE ACCOUNTADMIN;

-- Create a specific role for agent operations
CREATE ROLE IF NOT EXISTS AGENT_CREATOR;

-- Grant necessary privileges to the new role
GRANT CREATE FUNCTION ON SCHEMA FETII_AI.CHATAPP TO ROLE AGENT_CREATOR;
GRANT CREATE PROCEDURE ON SCHEMA FETII_AI.CHATAPP TO ROLE AGENT_CREATOR;
GRANT USAGE ON DATABASE FETII_AI TO ROLE AGENT_CREATOR;
GRANT USAGE ON SCHEMA FETII_AI.CHATAPP TO ROLE AGENT_CREATOR;
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE AGENT_CREATOR;

-- Grant Cortex privileges
GRANT CREATE CORTEX SEARCH SERVICE ON SCHEMA FETII_AI.CHATAPP TO ROLE AGENT_CREATOR;
GRANT USAGE ON CORTEX SEARCH SERVICE FETII_ADDRESS_SEARCH TO ROLE AGENT_CREATOR;

-- Grant the role to your user (replace YOUR_USERNAME)
GRANT ROLE AGENT_CREATOR TO USER YOUR_USERNAME;

-- Switch to the new role
USE ROLE AGENT_CREATOR;
USE DATABASE FETII_AI;
USE SCHEMA CHATAPP;

-- =============================================
-- STEP 9: VERIFY EVERYTHING IS WORKING
-- =============================================

-- Check permissions
SHOW GRANTS TO ROLE AGENT_CREATOR;

-- Test Cortex Search access
SELECT * FROM TABLE(
  FETII_AI.CHATAPP.FETII_ADDRESS_SEARCH(
    'moody center',
    LIMIT => 3
  )
);

-- =============================================
-- STEP 10: TROUBLESHOOTING QUERIES
-- =============================================

-- If you're still having issues, run these diagnostic queries:

-- Check current privileges
SHOW GRANTS TO ROLE ACCOUNTADMIN;
SHOW GRANTS TO ROLE SYSADMIN;

-- Check database and schema permissions
SHOW GRANTS ON DATABASE FETII_AI;
SHOW GRANTS ON SCHEMA FETII_AI.CHATAPP;

-- Check warehouse access
SHOW GRANTS ON WAREHOUSE COMPUTE_WH;

-- List all cortex search services
SHOW CORTEX SEARCH SERVICES;

-- =============================================
-- COMMON ERROR SOLUTIONS:
-- =============================================

-- ERROR: "Role does not have permission to create agents"
-- SOLUTION: Use ACCOUNTADMIN or create custom role with proper grants

-- ERROR: "Schema does not exist"
-- SOLUTION: CREATE SCHEMA FETII_AI.CHATAPP;

-- ERROR: "Insufficient privileges to operate on warehouse"
-- SOLUTION: GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE [YOUR_ROLE];

-- ERROR: "Cannot access Cortex Search Service"
-- SOLUTION: GRANT USAGE ON CORTEX SEARCH SERVICE [SERVICE_NAME] TO ROLE [YOUR_ROLE];
