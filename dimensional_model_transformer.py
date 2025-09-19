import pandas as pd
import numpy as np
from datetime import datetime
import os

class DimensionalModelTransformer:
    def __init__(self):
        self.dim_address = None
        self.dim_user = None  
        self.fact_trip = None
        self.fact_trip_riders = None
        self.address_lookup = {}
        
    def load_data(self):
        """Load all source data files"""
        print("Loading source data files...")
        
        # Load main data files
        self.trip_data = pd.read_csv('data/Trip Data.csv')
        self.rider_data = pd.read_csv('data/Rider Data.csv')
        self.rider_demographics = pd.read_csv('data/Rider Demographics.csv')
        self.address_data = pd.read_csv('output/address_validation_final_updated.csv')
        
        print(f"✓ Trip Data: {len(self.trip_data)} records")
        print(f"✓ Rider Data: {len(self.rider_data)} records") 
        print(f"✓ Rider Demographics: {len(self.rider_demographics)} records")
        print(f"✓ Address Data: {len(self.address_data)} records")
        
    def create_dim_address(self):
        """Create DIM_ADDRESS dimension table with surrogate keys"""
        print("\nCreating DIM_ADDRESS table...")
        
        # Get all unique addresses from both pickup and dropoff
        pickup_addresses = self.trip_data[['Pick Up Address', 'Pick Up Latitude', 'Pick Up Longitude']].copy()
        pickup_addresses.columns = ['original_address', 'latitude', 'longitude']
        
        dropoff_addresses = self.trip_data[['Drop Off Address', 'Drop Off Latitude', 'Drop Off Longitude']].copy()
        dropoff_addresses.columns = ['original_address', 'latitude', 'longitude']
        
        # Combine and deduplicate
        all_addresses = pd.concat([pickup_addresses, dropoff_addresses]).drop_duplicates(subset=['original_address'])
        
        # Merge with cleaned address data
        address_merged = all_addresses.merge(
            self.address_data[['original_address', 'address_line', 'city', 'state', 'zipcode', 'country']], 
            on='original_address', 
            how='left'
        )
        
        # Clean zipcode data (convert to string, remove decimals)
        address_merged['zipcode_clean'] = address_merged['zipcode'].astype(str).str.replace('.0', '', regex=False)
        address_merged.loc[address_merged['zipcode_clean'] == 'nan', 'zipcode_clean'] = ''
        
        # Create DIM_ADDRESS with surrogate keys
        self.dim_address = pd.DataFrame({
            'address_id': range(1, len(address_merged) + 1),
            'address_line': address_merged['address_line'],
            'city': address_merged['city'], 
            'state': address_merged['state'],
            'zipcode': address_merged['zipcode_clean'],
            'country': address_merged['country'],
            'latitude': address_merged['latitude'],
            'longitude': address_merged['longitude'],
            'original_address': address_merged['original_address']  # Keep for lookup
        })
        
        # Create lookup dictionary for address mapping
        self.address_lookup = dict(zip(self.dim_address['original_address'], self.dim_address['address_id']))
        
        print(f"✓ Created DIM_ADDRESS with {len(self.dim_address)} unique addresses")
        
    def create_dim_user(self):
        """Create DIM_USER dimension table"""
        print("\nCreating DIM_USER table...")
        
        # Get all unique users from both trip and rider data
        bookers = set(self.trip_data['Booking User ID'].unique())
        riders = set(self.rider_data['User ID'].unique()) 
        all_users = bookers.union(riders)
        
        print(f"  - Found {len(bookers)} unique bookers")
        print(f"  - Found {len(riders)} unique riders") 
        print(f"  - Total unique users: {len(all_users)}")
        
        # Create base dataframe with all users
        dim_user_base = pd.DataFrame({'User ID': list(all_users)})
        
        # Merge with demographics (left join to keep all users)
        dim_user_base = dim_user_base.merge(
            self.rider_demographics[['User ID', 'Age']], 
            on='User ID', 
            how='left'
        )
        
        # Clean age data and create age groups
        dim_user_base['Age'] = pd.to_numeric(dim_user_base['Age'], errors='coerce')
        
        def get_age_group(age):
            if pd.isna(age):
                return 'Unknown'
            age = int(age)
            if age < 18:
                return 'Under 18'
            elif age <= 25:
                return '18-25'
            elif age <= 35:
                return '26-35'
            elif age <= 45:
                return '36-45'
            elif age <= 55:
                return '46-55'
            else:
                return '55+'
        
        dim_user_base['age_group'] = dim_user_base['Age'].apply(get_age_group)
        
        # Determine user type (Booker, Rider, or Both)
        def get_user_type(user_id):
            is_booker = user_id in bookers
            is_rider = user_id in riders
            
            if is_booker and is_rider:
                return 'Both'
            elif is_booker:
                return 'Booker'
            elif is_rider:
                return 'Rider'
            else:
                return 'Unknown'
        
        dim_user_base['user_type'] = dim_user_base['User ID'].apply(get_user_type)
        
        # Create final DIM_USER
        self.dim_user = pd.DataFrame({
            'user_id': dim_user_base['User ID'],
            'age': dim_user_base['Age'].astype('Int64'),  # Convert to integer, keeps NaN as null
            'age_group': dim_user_base['age_group'],
            'user_type': dim_user_base['user_type']
        })
        
        print(f"✓ Created DIM_USER with {len(self.dim_user)} users")
        print(f"  - Booker only: {sum(self.dim_user['user_type'] == 'Booker')}")
        print(f"  - Rider only: {sum(self.dim_user['user_type'] == 'Rider')}")
        print(f"  - Both: {sum(self.dim_user['user_type'] == 'Both')}")
        print(f"  - With age data: {sum(~self.dim_user['age'].isna())}")
        print(f"  - Without age data: {sum(self.dim_user['age'].isna())}")
        
    def create_fact_trip(self):
        """Create FACT_TRIP fact table"""
        print("\nCreating FACT_TRIP table...")
        
        # Start with trip data
        fact_trip_base = self.trip_data.copy()
        
        # Parse datetime and create date/time dimensions
        fact_trip_base['trip_datetime'] = pd.to_datetime(fact_trip_base['Trip Date and Time'])
        
        fact_trip_base['trip_date'] = fact_trip_base['trip_datetime'].dt.date
        fact_trip_base['trip_time'] = fact_trip_base['trip_datetime'].dt.time
        fact_trip_base['day_of_week'] = fact_trip_base['trip_datetime'].dt.day_name()
        fact_trip_base['hour_of_day'] = fact_trip_base['trip_datetime'].dt.hour
        fact_trip_base['month'] = fact_trip_base['trip_datetime'].dt.month
        fact_trip_base['year'] = fact_trip_base['trip_datetime'].dt.year
        
        # Calculate actual riders count from rider data
        rider_counts = self.rider_data.groupby('Trip ID').size().reset_index(name='actual_riders_count')
        fact_trip_base = fact_trip_base.merge(rider_counts, left_on='Trip ID', right_on='Trip ID', how='left')
        fact_trip_base['actual_riders_count'] = fact_trip_base['actual_riders_count'].fillna(0)
        
        # Map addresses to surrogate keys
        fact_trip_base['pickup_address_id'] = fact_trip_base['Pick Up Address'].map(self.address_lookup)
        fact_trip_base['dropoff_address_id'] = fact_trip_base['Drop Off Address'].map(self.address_lookup)
        
        # Create final FACT_TRIP
        self.fact_trip = pd.DataFrame({
            'trip_id': fact_trip_base['Trip ID'],
            'booking_user_id': fact_trip_base['Booking User ID'],
            'pickup_address_id': fact_trip_base['pickup_address_id'],
            'dropoff_address_id': fact_trip_base['dropoff_address_id'],
            'trip_date': fact_trip_base['trip_date'],
            'trip_time': fact_trip_base['trip_time'],
            'day_of_week': fact_trip_base['day_of_week'],
            'hour_of_day': fact_trip_base['hour_of_day'],
            'month': fact_trip_base['month'],
            'year': fact_trip_base['year'],
            'total_passengers': fact_trip_base['Total Passengers'],
            'actual_riders_count': fact_trip_base['actual_riders_count'].astype(int),
            'pickup_latitude': fact_trip_base['Pick Up Latitude'],
            'pickup_longitude': fact_trip_base['Pick Up Longitude'],
            'dropoff_latitude': fact_trip_base['Drop Off Latitude'],
            'dropoff_longitude': fact_trip_base['Drop Off Longitude']
        })
        
        print(f"✓ Created FACT_TRIP with {len(self.fact_trip)} trips")
        print(f"  - Date range: {self.fact_trip['trip_date'].min()} to {self.fact_trip['trip_date'].max()}")
        
    def create_fact_trip_riders(self):
        """Create FACT_TRIP_RIDERS bridge table"""
        print("\nCreating FACT_TRIP_RIDERS bridge table...")
        
        # Use rider data as-is for the bridge table
        self.fact_trip_riders = pd.DataFrame({
            'trip_id': self.rider_data['Trip ID'],
            'rider_user_id': self.rider_data['User ID']
        })
        
        print(f"✓ Created FACT_TRIP_RIDERS with {len(self.fact_trip_riders)} trip-rider relationships")
        
    def generate_data_quality_report(self):
        """Generate data quality report"""
        print("\n" + "="*60)
        print("DATA QUALITY REPORT")
        print("="*60)
        
        print("\n📊 DIMENSIONAL MODEL SUMMARY:")
        print(f"├── DIM_ADDRESS: {len(self.dim_address):,} unique addresses")
        print(f"├── DIM_USER: {len(self.dim_user):,} users") 
        print(f"├── FACT_TRIP: {len(self.fact_trip):,} trips")
        print(f"└── FACT_TRIP_RIDERS: {len(self.fact_trip_riders):,} trip-rider relationships")
        
        print("\n🔍 DATA QUALITY CHECKS:")
        
        # Check for null foreign keys in fact table
        null_pickup = self.fact_trip['pickup_address_id'].isna().sum()
        null_dropoff = self.fact_trip['dropoff_address_id'].isna().sum()
        print(f"├── Null pickup address IDs: {null_pickup}")
        print(f"├── Null dropoff address IDs: {null_dropoff}")
        
        # Check passenger discrepancies  
        discrepancies = self.fact_trip[self.fact_trip['total_passengers'] != self.fact_trip['actual_riders_count']]
        print(f"├── Trips with passenger count discrepancies: {len(discrepancies)}")
        
        # Check for orphaned records
        orphaned_riders = len(self.fact_trip_riders[~self.fact_trip_riders['trip_id'].isin(self.fact_trip['trip_id'])])
        print(f"└── Orphaned rider records: {orphaned_riders}")
        
        if len(discrepancies) > 0:
            print("\n📋 SAMPLE PASSENGER DISCREPANCIES:")
            sample = discrepancies[['trip_id', 'total_passengers', 'actual_riders_count']].head()
            print(sample.to_string(index=False))
        
    def save_tables(self, output_dir='output/dimensional_model'):
        """Save all dimensional model tables as CSV files"""
        print(f"\nSaving dimensional model tables to {output_dir}/...")
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Save dimension tables
        dim_address_output = self.dim_address.drop('original_address', axis=1)  # Remove lookup column
        dim_address_output.to_csv(f'{output_dir}/DIM_ADDRESS.csv', index=False)
        print(f"✓ Saved DIM_ADDRESS.csv ({len(dim_address_output):,} records)")
        
        self.dim_user.to_csv(f'{output_dir}/DIM_USER.csv', index=False)
        print(f"✓ Saved DIM_USER.csv ({len(self.dim_user):,} records)")
        
        # Save fact tables
        self.fact_trip.to_csv(f'{output_dir}/FACT_TRIP.csv', index=False)
        print(f"✓ Saved FACT_TRIP.csv ({len(self.fact_trip):,} records)")
        
        self.fact_trip_riders.to_csv(f'{output_dir}/FACT_TRIP_RIDERS.csv', index=False)
        print(f"✓ Saved FACT_TRIP_RIDERS.csv ({len(self.fact_trip_riders):,} records)")
        
        print(f"\n🎯 All tables ready for Snowflake upload in '{output_dir}/'")
        
    def transform_all(self):
        """Run complete transformation pipeline"""
        print("🚀 Starting Dimensional Model Transformation...")
        print("="*60)
        
        self.load_data()
        self.create_dim_address()
        self.create_dim_user()
        self.create_fact_trip()
        self.create_fact_trip_riders()
        self.generate_data_quality_report()
        self.save_tables()
        
        print("\n✅ Transformation completed successfully!")
        print("📁 Files ready for Snowflake upload in 'output/dimensional_model/' directory")


def main():
    transformer = DimensionalModelTransformer()
    transformer.transform_all()

if __name__ == "__main__":
    main()
