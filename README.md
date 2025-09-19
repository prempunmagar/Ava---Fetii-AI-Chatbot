# Ava - Fetii AI Chat 🚀

An intelligent conversational analytics platform designed for ride-share transportation data analysis. Ava leverages Snowflake Cortex AI and Streamlit to transform complex transportation datasets into accessible insights through natural language conversation, eliminating the need for traditional SQL queries or complex data analysis tools.

![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)
![Snowflake](https://img.shields.io/badge/Snowflake-29B5E8?style=for-the-badge&logo=snowflake&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

## 🌟 Project Overview

Ava represents a breakthrough in transportation analytics, providing an intuitive chat-based interface that democratizes access to complex ride-share data. Built specifically for educational institutions, transportation companies, and urban planners, this platform enables users of all technical levels to extract meaningful insights from transportation data through simple conversational queries.

**Key Differentiators:**
- **Natural Language Processing**: Ask questions in plain English, no SQL required
- **Real-time Analytics**: Live data processing with instant responses
- **Intelligent Context**: Understands transportation-specific terminology and patterns
- **Enterprise Security**: Built on Snowflake's secure, scalable infrastructure
- **User-Friendly Design**: Professionally designed interface matching modern analytics platforms

## ✨ Features

- 🤖 **AI-Powered Analytics**: Natural language queries powered by Snowflake Cortex
- 📊 **Interactive Visualizations**: Beautiful charts and insights
- 🎯 **Smart Suggestions**: Pre-built questions to get you started
- 🔍 **Multi-Mode Search**: Analytics and Research modes
- 💬 **Conversational Interface**: Chat-based interaction with your data
- 🚀 **Cloud-Ready**: Deployable on Streamlit Cloud

## 🎯 Use Cases & Target Audiences

### 🎓 Educational Institutions
- **Campus Transportation**: Optimize shuttle routes and schedules
- **Student Mobility**: Analyze student travel patterns and preferences
- **Resource Planning**: Data-driven decisions for transportation infrastructure

### 🚗 Transportation Companies
- **Fleet Optimization**: Maximize vehicle utilization and efficiency
- **Demand Forecasting**: Predict peak usage times and locations
- **Customer Analytics**: Understand rider behavior and satisfaction

### 🏙️ Urban Planners & Government
- **Public Transit Planning**: Integrate with public transportation systems
- **Traffic Analysis**: Understand mobility patterns for city planning
- **Policy Development**: Data-driven transportation policy decisions

### 📊 Business Analysts & Researchers
- **Performance Monitoring**: Real-time KPI tracking and reporting
- **Trend Analysis**: Historical data analysis and predictive modeling
- **Operational Intelligence**: Efficiency optimization and cost reduction

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

### 🔧 Demo Mode (No Setup Required)
Ava includes a built-in demo mode that showcases the interface and capabilities without requiring full Snowflake configuration:

1. **Clone and Run**: Simply clone the repository and run the Streamlit app
2. **Explore Interface**: Experience the chat interface and see example responses
3. **Try Sample Questions**: Test the UI with pre-built transportation analytics questions
4. **See Capabilities**: Understand what Ava can do once fully configured

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

## 🏗️ Architecture & Technology

### Technology Stack
- **Frontend**: Streamlit with custom CSS styling for professional UI/UX
- **AI Engine**: Snowflake Cortex for natural language processing and analytics
- **Data Platform**: Snowflake Data Cloud for scalable data warehousing
- **Backend**: Python with Snowpark for data processing
- **Deployment**: Streamlit Cloud or Snowflake Native Apps

### System Architecture
```
┌─────────────────────────────────────────────┐
│              User Interface                 │
│          (Streamlit Frontend)               │
├─────────────────────────────────────────────┤
│           Chat Interface                    │
│      (Natural Language Input)              │
├─────────────────────────────────────────────┤
│          AI Processing                      │
│        (Snowflake Cortex)                  │
├─────────────────────────────────────────────┤
│           Data Layer                        │
│     (Snowflake Data Warehouse)             │
└─────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Ava---Fetii-AI-Chatbot/
├── streamlit_app.py          # Main Streamlit application with chat interface
├── requirements.txt          # Python dependencies and versions
├── environment.yml           # Conda environment configuration
├── snowflake.yml            # Snowflake Native App configuration
├── PROJECT_DESCRIPTION.md    # Comprehensive project documentation
├── README.md                # This file - quick start and overview
├── .gitignore               # Git ignore rules for security and cleanup
└── .env.example             # Environment variables template (not included)
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
- 📋 **Open a GitHub issue** for bugs and feature requests
- 📚 **Check the troubleshooting section** above for common solutions
- 📖 **Review Snowflake Cortex documentation** for advanced configuration
- 📄 **Read PROJECT_DESCRIPTION.md** for comprehensive technical details

## 📚 Additional Documentation

- **[PROJECT_DESCRIPTION.md](PROJECT_DESCRIPTION.md)**: Comprehensive technical documentation
- **[Snowflake Cortex Documentation](https://docs.snowflake.com/en/user-guide/snowflake-cortex)**: Official Snowflake AI documentation
- **[Streamlit Documentation](https://docs.streamlit.io/)**: Streamlit framework reference

---

**Made with ❤️ for better transportation analytics**

*Transforming complex transportation data into actionable insights through conversational AI*
