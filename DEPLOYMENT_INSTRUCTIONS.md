# FETII CHAT - Streamlit Deployment Instructions

## Quick Start

Your FETII CHAT agent is ready to deploy to Streamlit in Snowflake! Here's how:

## Prerequisites

1. **Snowflake CLI installed** - Download from: https://docs.snowflake.com/en/developer-guide/snowflake-cli/installation
2. **Your agent published** - ✅ Already done!
3. **Database access** - Make sure you have the right permissions

## Step 1: Configure Connection

Create a `config.toml` file in your `~/.snowflake/` directory:

```toml
[connections.default]
account = "YOUR_ACCOUNT_IDENTIFIER"
user = "YOUR_USERNAME"  
password = "YOUR_PASSWORD"  # or use private_key_file
warehouse = "COMPUTE_WH"
database = "YOUR_DATABASE"
schema = "YOUR_SCHEMA"
role = "YOUR_ROLE"
```

## Step 2: Update Agent Location

Edit `streamlit_app.py` and replace this line:
```python
f"{base_url}/api/v2/databases/YOUR_DATABASE/schemas/YOUR_SCHEMA/agents/FETII_CHAT/agent:run"
```

With your actual agent location:
```python
f"{base_url}/api/v2/databases/YOUR_DB/schemas/YOUR_SCHEMA/agents/YOUR_AGENT_NAME/agent:run"
```

## Step 3: Deploy [[memory:8039654]]

Open PowerShell/Terminal and run:

```bash
# Navigate to your project folder
cd "C:\Users\prems\Downloads\Fetti AI"

# Deploy the app
snow streamlit deploy --replace
```

## Step 4: Make Public

After deployment, to make it publicly accessible:

```sql
-- Grant access to public role (or specific roles)
GRANT USAGE ON STREAMLIT fetii_chat TO ROLE PUBLIC;
```

## Step 5: Get Your URL

```bash
snow streamlit get-url fetii_chat
```

## Troubleshooting

**Connection Issues?**
- Check your `config.toml` credentials
- Verify warehouse exists and you have access
- Make sure agent is in the specified database/schema

**Agent Not Found?**
- Verify agent name and location in Snowflake
- Check permissions to access the agent

**Deployment Fails?**
- Try: `snow streamlit list` to see existing apps
- Use `snow streamlit drop fetii_chat` to remove and redeploy

## Done! 🎉

Your FETII CHAT agent will be available at the URL provided by `get-url` command. Users can start chatting with your intelligent ride-share analytics assistant immediately!
