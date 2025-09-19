import streamlit as st
import requests
import json
import datetime
import os
from snowflake.snowpark import Session

# Page configuration
st.set_page_config(
    page_title="Ava - Fetii AI Chat",
    page_icon="💬",
    layout="wide"
)

# Get Snowflake session
@st.cache_resource
def get_snowflake_session():
    """Create Snowflake connection using environment variables or Streamlit secrets"""
    try:
        # Try to get credentials from Streamlit secrets (for Streamlit Cloud)
        if hasattr(st, 'secrets') and 'snowflake' in st.secrets:
            connection_params = {
                "account": st.secrets["snowflake"]["account"],
                "user": st.secrets["snowflake"]["user"],
                "password": st.secrets["snowflake"]["password"],
                "warehouse": st.secrets["snowflake"]["warehouse"],
                "database": st.secrets["snowflake"]["database"],
                "schema": st.secrets["snowflake"]["schema"],
                "role": st.secrets["snowflake"]["role"]
            }
        else:
            # Fallback to environment variables (for local development)
            connection_params = {
                "account": os.getenv("SNOWFLAKE_ACCOUNT"),
                "user": os.getenv("SNOWFLAKE_USER"),
                "password": os.getenv("SNOWFLAKE_PASSWORD"),
                "warehouse": os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
                "database": os.getenv("SNOWFLAKE_DATABASE"),
                "schema": os.getenv("SNOWFLAKE_SCHEMA"),
                "role": os.getenv("SNOWFLAKE_ROLE")
            }
        
        # Validate required parameters
        required_params = ["account", "user", "password", "database", "schema"]
        missing_params = [param for param in required_params if not connection_params.get(param)]
        
        if missing_params:
            # Return None to indicate demo mode instead of stopping the app
            return None
        
        # Create and return session
        return Session.builder.configs(connection_params).create()
        
    except Exception as e:
        # Return None to indicate demo mode instead of stopping the app
        return None

# Try to get Snowflake session, but allow app to run without it
session = get_snowflake_session()

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = []
if "show_chat" not in st.session_state:
    st.session_state.show_chat = False

# Custom CSS to match Snowflake Intelligence exactly
st.markdown("""
<style>
/* Hide Streamlit branding */
.stDeployButton {display: none;}
header[data-testid="stHeader"] {display: none;}
.stApp > header {display: none;}
.stToolbar {display: none;}

/* Main container styling */
.main .block-container {
    padding-top: 3rem;
    padding-left: 2rem;
    padding-right: 2rem;
    max-width: 1200px;
}

/* Header styling to match Snowflake */
.main-header {
    text-align: center;
    padding: 4rem 0 3rem 0;
}

.greeting {
    font-size: 3rem;
    font-weight: 400;
    color: #1f2937;
    margin-bottom: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.question {
    font-size: 2.2rem;
    font-weight: 400;
    color: #3b82f6;
    margin-bottom: 3rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Mode buttons to match exactly */
.mode-buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin: 2rem 0;
}

/* Override Streamlit button styling */
.stButton > button {
    background: #f8fafc !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 8px !important;
    padding: 0.75rem 1.5rem !important;
    font-size: 0.875rem !important;
    font-weight: 500 !important;
    color: #64748b !important;
    transition: all 0.2s ease !important;
    box-shadow: none !important;
    min-height: 44px !important;
    display: flex !important;
    align-items: center !important;
    gap: 0.5rem !important;
}

.stButton > button:hover {
    background: #f1f5f9 !important;
    border-color: #cbd5e1 !important;
    color: #475569 !important;
}

/* Active button styling */
.stButton > button[aria-pressed="true"] {
    background: #3b82f6 !important;
    border-color: #3b82f6 !important;
    color: white !important;
}

/* Input field styling */
.stTextInput > div > div > input {
    background: #ffffff !important;
    border: 1px solid #d1d5db !important;
    border-radius: 8px !important;
    padding: 0.75rem 1rem !important;
    font-size: 1rem !important;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
    min-height: 48px !important;
}

.stTextInput > div > div > input:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 1px #3b82f6 !important;
}

/* Suggestion buttons styling */
.suggestion-btn {
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 8px !important;
    padding: 1rem 1.5rem !important;
    margin: 0.5rem 0 !important;
    text-align: left !important;
    font-size: 0.875rem !important;
    font-weight: 400 !important;
    color: #374151 !important;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
    transition: all 0.2s ease !important;
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    gap: 0.75rem !important;
}

.suggestion-btn:hover {
    background: #f9fafb !important;
    border-color: #d1d5db !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
}

/* Mode display text */
.mode-display {
    text-align: center;
    color: #6b7280;
    font-size: 0.875rem;
    margin: 1rem 0 2rem 0;
    font-style: italic;
}

/* Remove default Streamlit spacing */
.element-container {
    margin-bottom: 0 !important;
}

/* Chat interface styling */
.chat-header {
    padding: 1rem 0;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 1rem;
}
</style>
""", unsafe_allow_html=True)

# Get current time for greeting
current_hour = datetime.datetime.now().hour
if current_hour < 12:
    greeting = "Good morning"
elif current_hour < 18:
    greeting = "Good afternoon"
else:
    greeting = "Good evening"

# Show initial interface or chat
if not st.session_state.show_chat:
    # Main landing page interface
    st.markdown('<div class="main-header">', unsafe_allow_html=True)
    st.markdown(f'<div class="greeting">{greeting}</div>', unsafe_allow_html=True)
    st.markdown('<div class="question">What insights can I help with?</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Mode selector buttons - styled to match Snowflake exactly
    col1, col2, col3 = st.columns([2, 1, 2])
    with col2:
        st.markdown('<div class="mode-buttons">', unsafe_allow_html=True)
        col_a, col_b = st.columns(2)
        with col_a:
            analytics_selected = st.button("📊 Analytics", key="analytics_btn", use_container_width=True)
        with col_b:
            research_selected = st.button("🔍 Research", key="research_btn", use_container_width=True)
        st.markdown('</div>', unsafe_allow_html=True)
        
        # Set mode based on button clicks
        if analytics_selected:
            st.session_state.mode = "analytics"
        elif research_selected:
            st.session_state.mode = "research"
        elif "mode" not in st.session_state:
            st.session_state.mode = "analytics"
    
    # Main input field
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        user_input = st.text_input("", placeholder="Ask Ava Intelligence...", label_visibility="collapsed", key="main_input")
        
        # Show mode and connection status
        connection_status = "Connected" if session is not None else "Demo Mode"
        status_color = "#22c55e" if session is not None else "#f59e0b"
        st.markdown(f'<div class="mode-display">Mode: {st.session_state.get("mode", "analytics").title()} • Sources: Auto • <span style="color: {status_color};">⚡ {connection_status}</span></div>', unsafe_allow_html=True)
    
    # Suggested questions with proper styling
    st.markdown("<br><br>", unsafe_allow_html=True)
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        # Custom styled buttons to match Snowflake suggestions
        if st.button("📊  Show me daily trip volumes for last week", key="q1", help="Analytics"):
            st.session_state.messages.append({"role": "user", "content": "Show me daily trip volumes for last week"})
            st.session_state.show_chat = True
            st.rerun()
        
        if st.button("📈  What's the difference between booked vs actual riders?", key="q2", help="Analytics"):
            st.session_state.messages.append({"role": "user", "content": "What's the difference between booked vs actual riders?"})
            st.session_state.show_chat = True
            st.rerun()
        
        if st.button("👥  What age groups ride most on weekends?", key="q3", help="Demographics"):
            st.session_state.messages.append({"role": "user", "content": "What age groups ride most on weekends?"})
            st.session_state.show_chat = True
            st.rerun()
    
    # Handle main input submission
    if user_input:
        st.session_state.messages.append({"role": "user", "content": user_input})
        st.session_state.show_chat = True
        st.rerun()

else:
    # Chat interface with proper header
    st.markdown('<div class="chat-header">', unsafe_allow_html=True)
    col1, col2, col3 = st.columns([1, 3, 1])
    with col2:
        st.markdown("### Ava - Fetii AI Chat")
        st.markdown("*Sources: Auto*")
        
        if st.button("← Back to Home", key="back_home"):
            st.session_state.show_chat = False
            st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Display chat messages
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # Chat input (only show in chat mode)  
    if prompt := st.chat_input("Hi! Ask me anything about your ride-share data..."):
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        
        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Generate response
        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            
            try:
                # Check if we have a valid Snowflake session
                if session is None:
                    # Demo mode - provide helpful response when no session available
                    demo_response = f"""Hi there! 👋

I'm Ava, your ride-share analytics assistant. I can see you asked about **{prompt}** - great question!

To get me fully connected to your data, you'll need to configure your Snowflake agent credentials:

**For Streamlit Cloud:**
Add these to your app secrets:
- `SNOWFLAKE_ACCOUNT`: Your Snowflake account identifier
- `SNOWFLAKE_USER`: Your username
- `SNOWFLAKE_PASSWORD`: Your password
- `SNOWFLAKE_WAREHOUSE`: Your warehouse (default: COMPUTE_WH)
- `SNOWFLAKE_DATABASE`: Your database name
- `SNOWFLAKE_SCHEMA`: Your schema name  
- `SNOWFLAKE_ROLE`: Your role
- `SNOWFLAKE_AGENT_NAME`: Your agent name (default: FETII_CHAT)

**For Local Development:**
Set these environment variables in your `.env` file.

Once configured, I'll be able to:
📊 Analyze trip volumes and trends
📍 Search for specific venues  
👥 Show rider demographics
📈 Provide utilization metrics

*This is a demo response - configure your agent credentials to get real analytics!*"""
                    
                    message_placeholder.markdown(demo_response)
                    full_response = demo_response
                else:
                    # Get account URL for API call
                    account_url = session.get_current_account().strip('"')  # Remove quotes if present
                    base_url = f"https://{account_url}.snowflakecomputing.com"
                    
                    # Get session token
                    try:
                        token = session.get_session_token() if hasattr(session, 'get_session_token') else session.sql("SELECT CURRENT_SESSION()").collect()[0][0]
                    except:
                        token = "temp_token"  # Fallback for local testing
                    # Prepare the API request
                    headers = {
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {token}"
                    }
                    
                    # Request payload for Cortex Agent
                    payload = {
                        "messages": [
                            {
                                "role": "user", 
                                "content": [{"type": "text", "text": prompt}]
                            }
                        ]
                    }
                
                    # Make API call to your Cortex agent
                    # Get agent configuration from environment/secrets
                    if hasattr(st, 'secrets') and 'snowflake' in st.secrets:
                        agent_database = st.secrets["snowflake"].get("database")
                        agent_schema = st.secrets["snowflake"].get("schema")  
                        agent_name = st.secrets["snowflake"].get("agent_name", "FETII_CHAT")
                    else:
                        agent_database = os.getenv("SNOWFLAKE_DATABASE")
                        agent_schema = os.getenv("SNOWFLAKE_SCHEMA")
                        agent_name = os.getenv("SNOWFLAKE_AGENT_NAME", "FETII_CHAT")
                    
                    agent_endpoint = f"{base_url}/api/v2/databases/{agent_database}/schemas/{agent_schema}/agents/{agent_name}/agent:run"
                    
                    # Check if agent is configured
                    if not agent_database or not agent_schema:
                        # Demo mode - provide helpful response
                        demo_response = f"""Hi there! 👋

I'm Ava, your ride-share analytics assistant. I can see you asked about **{prompt}** - great question!

To get me fully connected to your data, you'll need to configure your Snowflake agent credentials:

**For Streamlit Cloud:**
Add these to your app secrets:
- `SNOWFLAKE_DATABASE`: Your database name
- `SNOWFLAKE_SCHEMA`: Your schema name  
- `SNOWFLAKE_AGENT_NAME`: Your agent name (default: FETII_CHAT)

**For Local Development:**
Set these environment variables in your `.env` file.

Once configured, I'll be able to:
📊 Analyze trip volumes and trends
📍 Search for specific venues  
👥 Show rider demographics
📈 Provide utilization metrics

*This is a demo response - configure your agent credentials to get real analytics!*"""
                        
                        message_placeholder.markdown(demo_response)
                        full_response = demo_response
                        
                    else:
                        # Try actual API call
                        response = requests.post(
                            agent_endpoint,
                            headers=headers,
                            json=payload,
                            stream=True,
                            timeout=30
                        )
                        
                        if response.status_code == 200:
                            full_response = ""
                            
                            # Handle streaming response
                            for line in response.iter_lines():
                                if line:
                                    line_text = line.decode('utf-8')
                                    if line_text.startswith('data: '):
                                        try:
                                            data = json.loads(line_text[6:])  # Remove 'data: ' prefix
                                            if 'text' in data:
                                                full_response += data['text']
                                                message_placeholder.markdown(full_response + "▌")
                                        except json.JSONDecodeError:
                                            continue
                            
                            # Final message without cursor
                            message_placeholder.markdown(full_response)
                            
                        else:
                            # Fallback response if API fails
                            fallback_response = f"""I'm having trouble connecting to the analytics engine right now. 

However, I can help you with questions about:

📊 **Trip Analytics**: Daily/weekly volumes, passenger counts, utilization rates
📍 **Venue Intelligence**: Finding specific locations like Moody Center, campus areas
👥 **Demographics**: Age groups, rider vs booker behavior
📈 **Trends**: Peak hours, seasonal patterns, growth metrics

Could you try asking your question again? I'll do my best to help!

*Technical note: Response code {response.status_code}*"""
                            
                            message_placeholder.markdown(fallback_response)
                            full_response = fallback_response
            
            except Exception as e:
                # Error handling
                error_response = f"""I encountered an issue while processing your request. 

I'm designed to help with ride-share analytics including:
- Trip volumes and trends
- Venue searches and location insights  
- Rider demographics and behavior patterns
- Data quality and utilization metrics

Please try asking your question again, or contact your administrator if the issue persists.

*Error details: {str(e)}*"""
                
                message_placeholder.markdown(error_response)
                full_response = error_response
            
            # Add assistant response to chat history
            st.session_state.messages.append({"role": "assistant", "content": full_response})

    # Sidebar with chat controls
    with st.sidebar:
        st.markdown("### Chat Controls")
        if st.button("Clear Chat History"):
            st.session_state.messages = []
            st.rerun()
        
        st.markdown("### About Ava")
        st.markdown("""
        I help you explore:
        • Trip patterns and trends
        • Rider demographics and behavior  
        • Venue insights and locations
        • Data quality and metrics
        """)
        
        with st.expander("Example Questions"):
            st.markdown("""
            **📊 Analytics:**
            - How many trips this week?
            - What's our busiest time?
            - Show passenger utilization
            
            **📍 Venues:**
            - Find trips to Moody Center
            - Popular campus locations
            
            **👥 Demographics:**
            - Age groups on weekends
            - Rider vs booker patterns
            """)

# Footer
st.markdown("")
st.markdown("---")
st.markdown("*Ava - Fetii AI Chat • Powered by Snowflake Cortex*")
