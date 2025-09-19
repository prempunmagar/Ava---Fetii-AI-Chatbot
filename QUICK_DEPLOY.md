# Quick Deploy Guide

## ✅ Fixed Issues
1. **Environment.yml error** - Simplified dependencies
2. **Research button** - Now using buttons instead of dropdown

## 🚀 Deploy Steps

1. **Update agent location** in `streamlit_app.py` line ~195:
```python
f"{base_url}/api/v2/databases/YOUR_DATABASE/schemas/YOUR_SCHEMA/agents/FETII_CHAT/agent:run"
```

2. **Deploy** using Snowflake CLI:
```bash
snow streamlit deploy --replace
```

3. **Make public** (optional):
```sql
GRANT USAGE ON STREAMLIT fetii_chat TO ROLE PUBLIC;
```

4. **Get URL**:
```bash
snow streamlit get-url fetii_chat
```

## ✨ New Features
- **Button Mode Selector**: Analytics/Research buttons that highlight when selected
- **Mode Display**: Shows current mode and "Sources: Auto"
- **Cleaner Dependencies**: Removed problematic package versions

Your app is ready to go! 🎯
