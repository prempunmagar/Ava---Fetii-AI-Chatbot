import streamlit as st
import requests
import json
import datetime

# Page configuration
st.set_page_config(
    page_title="Ava - Fetii AI Chat",
    page_icon="💬",
    layout="wide"
)

# Snowflake configuration - try Streamlit secrets first, then environment variables
import os
try:
    # Try Streamlit secrets first (for Streamlit Cloud)
    PAT_TOKEN = st.secrets["snowflake"]["PAT_TOKEN"]
    SNOWFLAKE_ACCOUNT = st.secrets["snowflake"]["ACCOUNT"]
    AGENT_NAME = st.secrets["snowflake"]["AGENT_NAME"]
    DATABASE = st.secrets["snowflake"]["DATABASE"]
    SCHEMA = st.secrets["snowflake"]["SCHEMA"]
except:
    # Fallback to environment variables (for local development)
    PAT_TOKEN = os.getenv("SNOWFLAKE_PAT_TOKEN", "your-pat-token-here")
    SNOWFLAKE_ACCOUNT = os.getenv("SNOWFLAKE_ACCOUNT", "NBHIMLC-WB58290")
    AGENT_NAME = os.getenv("AGENT_NAME", "AVA")
    DATABASE = os.getenv("DATABASE", "SNOWFLAKE_INTELLIGENCE")
    SCHEMA = os.getenv("SCHEMA", "AGENTS")

# Correct Snowflake Cortex Agent API endpoint
AGENT_ENDPOINT = f"https://{SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/agents/{AGENT_NAME}/execute"

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
        user_input = st.text_input("Ask Ava Intelligence", placeholder="Ask Ava Intelligence...", label_visibility="collapsed", key="main_input")
        st.markdown(f'<div class="mode-display">Mode: {st.session_state.get("mode", "analytics").title()} • Sources: Auto</div>', unsafe_allow_html=True)
    
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
                # Prepare request payload for Snowflake Cortex Agent
                payload = {
                    "query": prompt,
                    "agent_name": AGENT_NAME,
                    "database": DATABASE,
                    "schema": SCHEMA
                }

                # Make request to agent endpoint
                headers = {
                    "Content-Type": "application/json", 
                    "Authorization": f"Bearer {PAT_TOKEN}",
                    "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT"
                }
                
                response = requests.post(
                    AGENT_ENDPOINT,
                    headers=headers,
                    json=payload,
                    timeout=60
                )
                
                if response.status_code != 200:
                    st.error(f"Request failed with status code: {response.status_code}")
                    st.error(f"Response: {response.text}")
                    full_response = "Sorry, I encountered an error processing your request."
                else:
                    response_data = response.json()
                    
                    # Handle different response formats
                    if 'result' in response_data:
                        full_response = response_data['result']
                    elif 'response' in response_data:
                        full_response = response_data['response']
                    elif 'message' in response_data:
                        full_response = response_data['message']
                    else:
                        full_response = str(response_data)
                    
                    # Simulate typing effect
                    words = full_response.split()
                    displayed_text = ""
                    for word in words:
                        displayed_text += word + " "
                        message_placeholder.markdown(displayed_text + "▌")
                    message_placeholder.markdown(full_response)
            
            except Exception as e:
                error_response = f"❌ Sorry, I encountered an error: {str(e)}"
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