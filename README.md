# Ava - Fetii AI Chat 🚀

An intelligent ride-share analytics chatbot powered by Snowflake Cortex and Streamlit. Ava provides natural language access to your transportation data with beautiful visualizations and insights.

![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)
![Snowflake](https://img.shields.io/badge/Snowflake-29B5E8?style=for-the-badge&logo=snowflake&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

## ✨ Features

- 🤖 **AI-Powered Analytics**: Natural language queries powered by Snowflake Cortex
- 📊 **Interactive Visualizations**: Beautiful charts and insights
- 🎯 **Smart Suggestions**: Pre-built questions to get you started
- 🔍 **Multi-Mode Search**: Analytics and Research modes
- 💬 **Conversational Interface**: Chat-based interaction with your data
- 🚀 **Cloud-Ready**: Deployable on Streamlit Cloud

## 🎯 What Ava Can Do

### 📊 Trip Analytics
- Daily/weekly trip volumes and trends
- Passenger counts and utilization rates
- Peak hour analysis and seasonal patterns

### 📍 Venue Intelligence  
- Location-based insights (e.g., "trips to Moody Center")
- Popular destination analysis
- Campus area utilization

### 👥 Demographics & Behavior
- Age group analysis and preferences
- Rider vs booker behavior patterns
- Weekend vs weekday trends

### 📈 Business Metrics
- Growth metrics and KPIs
- Data quality assessments
- Operational insights

## 🚀 Quick Start

### Prerequisites

- **Snowflake Account** with Cortex enabled
- **Deployed Cortex Agent** (see [Agent Setup](#agent-setup))
- **Python 3.8+**

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/fetii-ai-chat.git
cd fetii-ai-chat
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```env
SNOWFLAKE_ACCOUNT=your-account.snowflakecomputing.com
SNOWFLAKE_USER=your-username
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=your-database
SNOWFLAKE_SCHEMA=your-schema
SNOWFLAKE_ROLE=your-role
SNOWFLAKE_AGENT_NAME=FETII_CHAT
```

### 4. Run Locally

```bash
streamlit run streamlit_app.py
```

The app will be available at `http://localhost:8501`

## ☁️ Deploy to Streamlit Cloud

### 1. Fork this Repository

Click the "Fork" button on GitHub to create your own copy.

### 2. Connect to Streamlit Cloud

1. Go to [share.streamlit.io](https://share.streamlit.io)
2. Sign in with GitHub
3. Click "New app"
4. Select your forked repository
5. Set main file path: `streamlit_app.py`

### 3. Configure Secrets

In your Streamlit Cloud app settings, add these secrets:

```toml
[snowflake]
account = "your-account.snowflakecomputing.com"
user = "your-username" 
password = "your-password"
warehouse = "COMPUTE_WH"
database = "your-database"
schema = "your-schema"
role = "your-role"
agent_name = "FETII_CHAT"
```

### 4. Deploy

Click "Deploy" and your app will be live! 🎉

## 🤖 Agent Setup

Your Snowflake Cortex agent should already be deployed. If not, you'll need:

1. **Data Model**: Dimensional tables for trips, riders, and addresses
2. **Cortex Agent**: Configured with your data schema
3. **Permissions**: Appropriate roles and grants

Refer to your existing agent configuration files for detailed setup instructions.

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SNOWFLAKE_ACCOUNT` | Your Snowflake account identifier | Required |
| `SNOWFLAKE_USER` | Username for authentication | Required |  
| `SNOWFLAKE_PASSWORD` | Password for authentication | Required |
| `SNOWFLAKE_WAREHOUSE` | Compute warehouse name | `COMPUTE_WH` |
| `SNOWFLAKE_DATABASE` | Database containing your data | Required |
| `SNOWFLAKE_SCHEMA` | Schema containing your agent | Required |
| `SNOWFLAKE_ROLE` | Role for permissions | Required |
| `SNOWFLAKE_AGENT_NAME` | Name of your Cortex agent | `FETII_CHAT` |

### Streamlit Secrets

For Streamlit Cloud deployment, configure the same values in the `[snowflake]` section of your app secrets.

## 🎨 Customization

### UI Themes
The app uses a custom theme matching Snowflake Intelligence. Modify the CSS in `streamlit_app.py` to customize colors and styling.

### Agent Behavior  
Update your Cortex agent configuration in Snowflake to modify AI responses and capabilities.

### Suggested Questions
Edit the pre-built questions in `streamlit_app.py` (lines ~215-228) to match your use cases.

## 📁 Project Structure

```
fetii-ai-chat/
├── streamlit_app.py          # Main Streamlit application
├── requirements.txt          # Python dependencies  
├── environment.yml           # Conda environment file
├── snowflake.yml            # Snowflake app configuration
├── README.md                # This file
├── .gitignore               # Git ignore rules
└── .env.example             # Environment variables template
```

## 🐛 Troubleshooting

### Connection Issues
- Verify your Snowflake credentials are correct
- Check that your warehouse is running
- Ensure you have the necessary permissions

### Agent Not Found
- Confirm your agent name and location in Snowflake
- Verify the agent is deployed and accessible
- Check database and schema names

### Permission Errors
- Ensure your role has access to the agent
- Grant necessary permissions on the database/schema
- Verify warehouse usage rights

## 📝 Example Questions

Try asking Ava:

- "Show me daily trip volumes for last week"
- "What's the difference between booked vs actual riders?"
- "What age groups ride most on weekends?"
- "Find trips to Moody Center"
- "What are our peak hours?"
- "Show me utilization trends"

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Snowflake Cortex** for AI capabilities
- **Streamlit** for the beautiful web framework
- **Your ride-share data** for making this all possible!

## 📧 Support

For questions or issues:
- Open a GitHub issue
- Check the troubleshooting section above
- Review Snowflake Cortex documentation

---

Made with ❤️ for better transportation analytics
