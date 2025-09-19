"""
CORTEX SEARCH + ANALYST AGENT
Intelligent agent that routes queries between Cortex Search and Cortex Analyst
"""

import snowflake.connector
import json
from typing import Dict, Any, List

class FetiiRideShareAgent:
    def __init__(self, connection_params: Dict[str, str]):
        """Initialize agent with Snowflake connection"""
        self.conn = snowflake.connector.connect(**connection_params)
        self.cursor = self.conn.cursor()
        
    def route_query(self, user_question: str) -> str:
        """Determine which service to use based on question"""
        venue_keywords = ['moody', 'campus', 'downtown', 'venue', 'location', 'place']
        analytics_keywords = ['average', 'total', 'by day', 'demographics', 'age group']
        combined_keywords = ['trips to', 'popular pickup', 'busiest destination']
        
        question_lower = user_question.lower()
        
        if any(keyword in question_lower for keyword in combined_keywords):
            return 'COMBINED'
        elif any(keyword in question_lower for keyword in venue_keywords):
            return 'VENUE_SEARCH'  
        elif any(keyword in question_lower for keyword in analytics_keywords):
            return 'ANALYTICS'
        else:
            return 'ANALYTICS'  # Default
    
    def search_venues(self, search_term: str) -> List[Dict]:
        """Use Cortex Search to find venues"""
        query = f"""
        SELECT * FROM TABLE(
            FETII_AI.CHATAPP.find_venues('{search_term}')
        )
        """
        
        self.cursor.execute(query)
        results = self.cursor.fetchall()
        columns = [desc[0] for desc in self.cursor.description]
        
        return [dict(zip(columns, row)) for row in results]
    
    def analyze_venue(self, venue_name: str, time_period: str = 'all') -> List[Dict]:
        """Get analytics for specific venue"""
        query = f"""
        SELECT * FROM TABLE(
            FETII_AI.CHATAPP.analyze_venue_trips('{venue_name}', '{time_period}')
        )
        """
        
        self.cursor.execute(query)
        results = self.cursor.fetchall()
        columns = [desc[0] for desc in self.cursor.description]
        
        return [dict(zip(columns, row)) for row in results]
    
    def ask_cortex_analyst(self, question: str) -> Dict:
        """Use Cortex Analyst for structured analytics"""
        # This would integrate with your Cortex Analyst setup
        # For now, showing the structure
        
        analyst_query = f"""
        SELECT SNOWFLAKE.CORTEX.COMPLETE(
            'snowflake-arctic',
            'Based on the FETII ride-share data, {question}. 
             Use the semantic model to generate appropriate SQL.'
        ) as response
        """
        
        self.cursor.execute(analyst_query)
        result = self.cursor.fetchone()
        return {"response": result[0] if result else "No response"}
    
    def answer_question(self, user_question: str) -> Dict[str, Any]:
        """Main method to answer user questions intelligently"""
        
        route = self.route_query(user_question)
        print(f"🧠 Route determined: {route}")
        
        if route == 'VENUE_SEARCH':
            # Extract venue name from question (simple keyword extraction)
            venue_terms = self._extract_venue_terms(user_question)
            results = []
            
            for term in venue_terms:
                venues = self.search_venues(term)
                results.extend(venues)
            
            return {
                "type": "venue_search",
                "question": user_question,
                "venues_found": results,
                "answer": f"Found {len(results)} venues matching your search"
            }
            
        elif route == 'COMBINED':
            # Use both services
            venue_terms = self._extract_venue_terms(user_question)
            
            if venue_terms:
                # First find the venues
                venues = self.search_venues(venue_terms[0])
                
                # Then analyze them
                analytics = []
                for venue in venues[:3]:  # Top 3 matches
                    venue_stats = self.analyze_venue(venue['ADDRESS_LINE'])
                    analytics.extend(venue_stats)
                
                return {
                    "type": "combined",
                    "question": user_question,
                    "venues_found": venues,
                    "analytics": analytics,
                    "answer": self._format_combined_response(venues, analytics)
                }
        
        else:  # ANALYTICS
            # Use Cortex Analyst
            response = self.ask_cortex_analyst(user_question)
            
            return {
                "type": "analytics", 
                "question": user_question,
                "analyst_response": response,
                "answer": response.get("response", "Unable to analyze")
            }
    
    def _extract_venue_terms(self, question: str) -> List[str]:
        """Extract potential venue names from question"""
        # Simple extraction - could be enhanced with NLP
        venue_indicators = [
            'moody center', 'moody', 'campus', 'downtown', 
            'university', 'center', 'district'
        ]
        
        question_lower = question.lower()
        found_terms = []
        
        for term in venue_indicators:
            if term in question_lower:
                found_terms.append(term)
                
        return found_terms or ['downtown']  # Default fallback
    
    def _format_combined_response(self, venues: List[Dict], analytics: List[Dict]) -> str:
        """Format response combining venue search and analytics"""
        if not venues or not analytics:
            return "No data found for the specified venue"
            
        venue_names = [v['ADDRESS_LINE'] for v in venues[:3]]
        total_trips = sum(a.get('TOTAL_TRIPS', 0) for a in analytics)
        
        return f"""
        Found venues: {', '.join(venue_names)}
        Total trips: {total_trips}
        Most popular: {analytics[0]['VENUE_NAME'] if analytics else 'N/A'}
        """
    
    def close(self):
        """Close database connection"""
        self.cursor.close()
        self.conn.close()


# Example Usage
if __name__ == "__main__":
    # Initialize agent
    connection_params = {
        'user': 'YOUR_USER',
        'password': 'YOUR_PASSWORD', 
        'account': 'YOUR_ACCOUNT',
        'warehouse': 'COMPUTE_WH',
        'database': 'FETII_AI',
        'schema': 'CHATAPP'
    }
    
    agent = FetiiRideShareAgent(connection_params)
    
    # Test questions
    test_questions = [
        "How many trips went to Moody Center last month?",  # COMBINED
        "What are the most popular campus locations?",      # VENUE_SEARCH  
        "Show me average passengers by day of week",        # ANALYTICS
        "Which downtown venues are busiest on weekends?"    # COMBINED
    ]
    
    for question in test_questions:
        print(f"\n❓ Question: {question}")
        response = agent.answer_question(question)
        print(f"💬 Answer: {response['answer']}")
        print(f"🔧 Type: {response['type']}")
    
    agent.close()
