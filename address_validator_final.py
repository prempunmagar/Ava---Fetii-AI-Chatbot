#!/usr/bin/env python3
"""
Final Address Validator with Improved Component Parsing
Fixes: Empty address lines, missing zip codes, Unicode cleanup, single output file
"""

import pandas as pd
import requests
import json
import logging
import time
import os
import re
from typing import Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('address_validation_final.log', encoding='utf-8'),
        # Removed StreamHandler to avoid Unicode console errors
    ]
)
logger = logging.getLogger(__name__)

class AddressValidator:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://addressvalidation.googleapis.com/v1:validateAddress"
        self.session = requests.Session()
        
    def clean_text(self, text: str) -> str:
        """Clean text by removing problematic Unicode characters and normalizing"""
        if not text:
            return ""
        
        # Remove or replace problematic Unicode characters
        # Replace em dash, smart quotes, and other special chars
        replacements = {
            '鈥?': '-',  # em dash
            '鈥檚': "'s",  # smart apostrophe
            '鈥?': '"',   # smart quote left
            '鈥?': '"',   # smart quote right
            '鈥?': "'",   # smart apostrophe left
            '鈥?': "'",   # smart apostrophe right
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        # Remove any remaining non-ASCII characters that might cause issues
        # Keep basic punctuation and letters
        text = re.sub(r'[^\x00-\x7F]+', '', text)
        
        # Clean up extra spaces
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text

    def validate_address(self, address: str, region_code: str = "US") -> Dict:
        """Validate a single address using Google's Address Validation API"""
        
        # Clean the input address
        cleaned_address = self.clean_text(address)
        
        payload = {
            "address": {
                "addressLines": [cleaned_address],
                "regionCode": region_code
            }
        }
        
        # Only enable USPS CASS for US/PR addresses
        if region_code in ("US", "PR"):
            payload["enableUspsCass"] = True
        
        params = {"key": self.api_key}
        headers = {"Content-Type": "application/json"}
        
        try:
            response = self.session.post(
                self.base_url, 
                headers=headers, 
                params=params, 
                json=payload,
                timeout=15
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()
                }
            else:
                logger.error(f"API error {response.status_code}: {response.text}")
                return {
                    'success': False,
                    'error': f"HTTP {response.status_code}: {response.reason}",
                    'data': None
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'data': None
            }

    def extract_address_line_1(self, address_components: List[Dict], formatted_address: str, missing_types: List[str]) -> str:
        """Extract address line 1 with improved fallback logic"""
        
        # Method 1: Try to build from street_number + route
        street_number = ""
        route = ""
        
        for component in address_components:
            component_type = component.get('componentType', '')
            text = component.get('componentName', {}).get('text', '')
            
            if component_type == 'street_number':
                street_number = text
            elif component_type == 'route':
                route = text
        
        # If we have both street number and route, combine them
        if street_number and route:
            return f"{street_number} {route}".strip()
        elif route:  # Just route without number
            return route.strip()
        
        # Method 2: If street components are missing, try to extract from formatted address
        if 'street_number' in missing_types or 'route' in missing_types:
            # Try to extract the first line from formatted address
            if formatted_address:
                # Split by comma and take first part (usually street address)
                parts = formatted_address.split(',')
                if parts:
                    first_part = parts[0].strip()
                    # Make sure it's not just a business name or area
                    if any(word in first_part.lower() for word in ['street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr', 'boulevard', 'blvd', 'lane', 'ln']):
                        return first_part
        
        # Method 3: Look for establishment or point_of_interest as fallback
        for component in address_components:
            component_type = component.get('componentType', '')
            text = component.get('componentName', {}).get('text', '')
            
            if component_type in ['establishment', 'point_of_interest'] and text:
                return text.strip()
        
        # Method 4: If all else fails, try to get something meaningful from formatted address
        if formatted_address:
            parts = formatted_address.split(',')
            if parts:
                return parts[0].strip()
        
        return ""

    def parse_address_components(self, result_data: Dict) -> Dict:
        """Parse address components with improved handling for missing data"""
        
        components = {
            'address_line_1': '',
            'state': '',
            'country': '',
            'zipcode': ''
        }
        
        # Extract main data
        result = result_data.get('result', {})
        address = result.get('address', {})
        address_components = address.get('addressComponents', [])
        formatted_address = address.get('formattedAddress', '')
        missing_types = address.get('missingComponentTypes', [])
        
        # Extract standard components
        for component in address_components:
            component_type = component.get('componentType', '')
            text = component.get('componentName', {}).get('text', '')
            
            if component_type == 'administrative_area_level_1':
                components['state'] = text
            elif component_type == 'postal_code':
                components['zipcode'] = text
            elif component_type == 'country':
                components['country'] = text
        
        # Handle address line 1 with improved logic
        components['address_line_1'] = self.extract_address_line_1(
            address_components, formatted_address, missing_types
        )
        
        # If zipcode is still missing, try to extract from formatted address
        if not components['zipcode'] and formatted_address:
            # Look for zip code pattern in formatted address (US format)
            zip_match = re.search(r'\b(\d{5}(?:-\d{4})?)\b', formatted_address)
            if zip_match:
                full_zip = zip_match.group(1)
                # Extract main zip (before hyphen)
                components['zipcode'] = full_zip.split('-')[0]
        
        return components

    def process_validation_result(self, original_address: str, result: Dict) -> Dict:
        """Process validation result and extract needed fields"""
        
        if not result['success']:
            return {
                'original_address': original_address,
                'standardized_address': '',
                'address_line_1': '',
                'state': '',
                'zipcode': '',
                'country': '',
                'google_recommendation': 'ERROR'
            }
        
        data = result['data']
        result_obj = data.get('result', {})
        
        # Extract standardized address
        address = result_obj.get('address', {})
        standardized_address = self.clean_text(address.get('formattedAddress', ''))
        
        # Extract verdict information
        verdict = result_obj.get('verdict', {})
        google_recommendation = verdict.get('possibleNextAction', 'UNKNOWN')
        
        # Parse components
        parsed_components = self.parse_address_components(data)
        
        return {
            'original_address': original_address,
            'standardized_address': standardized_address,
            'address_line_1': parsed_components['address_line_1'],
            'state': parsed_components['state'],
            'zipcode': parsed_components['zipcode'],
            'country': parsed_components['country'],
            'google_recommendation': google_recommendation
        }


def validate_addresses_batch(addresses: List[str], api_key: str) -> List[Dict]:
    """Validate a batch of addresses with rate limiting"""
    
    validator = AddressValidator(api_key)
    results = []
    
    # Rate limiting: 10 requests per second
    request_interval = 0.1  # 100ms between requests
    batch_size = 10  # Pause every 10 requests
    
    for i, address in enumerate(addresses, 1):
        logger.info(f"Validating address {i}/{len(addresses)}: {address[:50]}...")
        
        # Validate the address
        validation_result = validator.validate_address(address)
        
        # Process the result
        processed_result = validator.process_validation_result(address, validation_result)
        results.append(processed_result)
        
        # Rate limiting
        if i % batch_size == 0:
            logger.info(f"Processed {i} addresses, pausing for rate limiting...")
            time.sleep(1)  # Longer pause every batch
        else:
            time.sleep(request_interval)
    
    return results


def main():
    """Main function to run address validation"""
    
    # Set API key directly
    API_KEY = "AIzaSyDLmxOWH7rQ8UBM0p_mGthOYbf7ElKniV0"
    os.environ["GOOGLE_MAPS_API_KEY"] = API_KEY
    
    logger.info("Starting final address validation process")
    
    # Step 1: Load addresses from Trip Data
    logger.info("Step 1: Loading addresses from Trip Data")
    try:
        df = pd.read_csv('data/Trip Data.csv')
        
        # Extract unique addresses from pickup and dropoff columns
        pickup_addresses = df['Pick Up Address'].dropna().unique()
        dropoff_addresses = df['Drop Off Address'].dropna().unique()
        
        # Combine and get unique addresses
        all_addresses = list(set(list(pickup_addresses) + list(dropoff_addresses)))
        
        logger.info(f"Found {len(all_addresses)} unique addresses to validate")
        
    except Exception as e:
        logger.error(f"Error loading Trip Data: {str(e)}")
        return
    
    # Step 2: Validate addresses
    logger.info("Step 2: Validating addresses with Google API")
    validation_results = validate_addresses_batch(all_addresses, API_KEY)
    
    logger.info("Address validation completed")
    
    # Step 3: Create single output file
    logger.info("Step 3: Creating final output file")
    
    # Create DataFrame with final structure
    df_final = pd.DataFrame(validation_results)
    
    # Reorder columns to match your specification
    column_order = [
        'original_address',
        'standardized_address', 
        'address_line_1',
        'state',
        'zipcode',
        'country',
        'google_recommendation'
    ]
    
    df_final = df_final[column_order]
    
    # Create output directory if it doesn't exist
    os.makedirs('output', exist_ok=True)
    
    # Save final output file
    output_file = 'output/address_validation_final.csv'
    df_final.to_csv(output_file, index=False)
    
    logger.info(f"Created final output file: {output_file}")
    
    # Print summary
    successful_validations = len([r for r in validation_results if r['google_recommendation'] != 'ERROR'])
    failed_validations = len(validation_results) - successful_validations
    
    print(f"""
        Final Address Validation Complete!
        =================================
        Total addresses processed: {len(validation_results)}
        Successful validations: {successful_validations}
        Failed validations: {failed_validations}

        Output file created: {output_file}
        
        Columns:
        - Original Address: Input address as provided
        - Standardized Address: Google's cleaned/formatted version  
        - Address Line 1: Street address (with fallbacks for missing data)
        - State: State/province
        - Zip Code: Postal code (main zip only, no suffix)
        - Country: Country name
        - Google Recommendation: Google's suggested next action (ACCEPT/FIX/CONFIRM/REJECT)
    """)


if __name__ == "__main__":
    main()
