import pandas as pd
import numpy as np
from datetime import datetime
import os
import warnings
warnings.filterwarnings('ignore')

class DimensionalModelTransformerFixed:
    """
    Fixed version of the dimensional model transformer with comprehensive
    data quality checks and improvements.
    """
    def __init__(self):
        self.dim_address = None
        self.dim_user = None  
        self.fact_trip = None
        self.fact_trip_riders = None
        self.address_lookup = {}
        self.data_quality_issues = []
        
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
        """Create DIM_ADDRESS dimension table with improved deduplication and validation"""
        print("\nCreating DIM_ADDRESS table with enhanced quality checks...")
        
        # Get all unique addresses from both pickup and dropoff
        pickup_addresses = self.trip_data[['Pick Up Address', 'Pick Up Latitude', 'Pick Up Longitude']].copy()
        pickup_addresses.columns = ['original_address', 'latitude', 'longitude']
        
        dropoff_addresses = self.trip_data[['Drop Off Address', 'Drop Off Latitude', 'Drop Off Longitude']].copy()
        dropoff_addresses.columns = ['original_address', 'latitude', 'longitude']
        
        # Combine with improved deduplication using composite key
        all_addresses = pd.concat([pickup_addresses, dropoff_addresses])
        
        # Round coordinates to 6 decimal places to handle floating point issues
        all_addresses['latitude'] = all_addresses['latitude'].round(6)
        all_addresses['longitude'] = all_addresses['longitude'].round(6)
        
        # Deduplicate using both coordinates AND address text
        all_addresses = all_addresses.drop_duplicates(
            subset=['latitude', 'longitude', 'original_address']
        )
        
        # Merge with cleaned address data
        address_merged = all_addresses.merge(
            self.address_data[['original_address', 'address_line', 'city', 'state', 'zipcode', 'country']], 
            on='original_address', 
            how='left'
        )
        
        # Enhanced zipcode cleaning
        address_merged['zipcode_clean'] = address_merged['zipcode'].astype(str).str.strip()
        
        # Mark invalid zipcodes
        invalid_zip_values = ['nan', '0', 'None', '', 'NaN']
        address_merged.loc[address_merged['zipcode_clean'].isin(invalid_zip_values), 'zipcode_clean'] = ''
        
        # Standardize valid zipcodes to 5 digits
        valid_zips = address_merged['zipcode_clean'] != ''
        address_merged.loc[valid_zips, 'zipcode_clean'] = (
            address_merged.loc[valid_zips, 'zipcode_clean']
            .str.extract(r'(\d{5})', expand=False)
            .fillna('')
        )
        
        # Validate coordinates for Austin area (approximate boundaries)
        austin_lat_range = (30.1, 30.6)  # Rough Austin area latitude range
        austin_lon_range = (-98.2, -97.5)  # Rough Austin area longitude range
        
        address_merged['coord_valid'] = (
            (address_merged['latitude'].between(*austin_lat_range)) & 
            (address_merged['longitude'].between(*austin_lon_range))
        )
        
        invalid_coords = address_merged[~address_merged['coord_valid']]
        if len(invalid_coords) > 0:
            print(f"  ⚠️ WARNING: {len(invalid_coords)} addresses have coordinates outside Austin area")
            self.data_quality_issues.append({
                'table': 'DIM_ADDRESS',
                'issue': 'Invalid coordinates',
                'count': len(invalid_coords)
            })
        
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
            'coordinate_valid_flag': address_merged['coord_valid'],
            'original_address': address_merged['original_address']  # Keep for lookup
        })
        
        # Create lookup dictionary for address mapping
        self.address_lookup = dict(zip(self.dim_address['original_address'], self.dim_address['address_id']))
        
        # Report duplicate addresses
        dup_coords = self.dim_address.groupby(['latitude', 'longitude']).size()
        dup_count = (dup_coords > 1).sum()
        if dup_count > 0:
            print(f"  ⚠️ WARNING: {dup_count} coordinate pairs have multiple addresses")
            self.data_quality_issues.append({
                'table': 'DIM_ADDRESS',
                'issue': 'Duplicate coordinates',
                'count': dup_count
            })
        
        print(f"✓ Created DIM_ADDRESS with {len(self.dim_address)} unique addresses")
        
    def create_dim_user(self):
        """Create DIM_USER dimension table with age validation"""
        print("\nCreating DIM_USER table with enhanced validation...")
        
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
        
        # Clean age data with validation
        dim_user_base['Age'] = pd.to_numeric(dim_user_base['Age'], errors='coerce')
        
        # Add age quality flag
        dim_user_base['age_quality_flag'] = 'Valid'
        dim_user_base.loc[dim_user_base['Age'].isna(), 'age_quality_flag'] = 'Missing'
        dim_user_base.loc[dim_user_base['Age'] < 16, 'age_quality_flag'] = 'Suspicious_Young'
        dim_user_base.loc[dim_user_base['Age'] > 100, 'age_quality_flag'] = 'Suspicious_Old'
        
        # Report suspicious ages
        suspicious_ages = dim_user_base[dim_user_base['age_quality_flag'].str.contains('Suspicious')]
        if len(suspicious_ages) > 0:
            print(f"  ⚠️ WARNING: {len(suspicious_ages)} users have suspicious ages")
            unique_ages = suspicious_ages['Age'].unique()
            print(f"    Ages found: {sorted(unique_ages)[:20]}")  # Show first 20
            self.data_quality_issues.append({
                'table': 'DIM_USER',
                'issue': 'Suspicious ages',
                'count': len(suspicious_ages)
            })
        
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
            elif age <= 65:
                return '56-65'
            else:
                return '65+'
        
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
            'user_type': dim_user_base['user_type'],
            'age_quality_flag': dim_user_base['age_quality_flag']
        })
        
        print(f"✓ Created DIM_USER with {len(self.dim_user)} users")
        print(f"  - Booker only: {sum(self.dim_user['user_type'] == 'Booker')}")
        print(f"  - Rider only: {sum(self.dim_user['user_type'] == 'Rider')}")
        print(f"  - Both: {sum(self.dim_user['user_type'] == 'Both')}")
        print(f"  - With valid age data: {sum(self.dim_user['age_quality_flag'] == 'Valid')}")
        print(f"  - Without age data: {sum(self.dim_user['age_quality_flag'] == 'Missing')}")
        
    def create_fact_trip(self):
        """Create FACT_TRIP fact table with enhanced validation and quality flags"""
        print("\nCreating FACT_TRIP table with comprehensive quality checks...")
        
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
        fact_trip_base['is_weekend'] = fact_trip_base['trip_datetime'].dt.dayofweek.isin([5, 6])
        
        # Time of day categorization
        def get_time_period(hour):
            if 5 <= hour < 12:
                return 'Morning'
            elif 12 <= hour < 17:
                return 'Afternoon'
            elif 17 <= hour < 21:
                return 'Evening'
            else:
                return 'Night'
        
        fact_trip_base['time_period'] = fact_trip_base['hour_of_day'].apply(get_time_period)
        
        # Calculate actual riders count from rider data
        rider_counts = self.rider_data.groupby('Trip ID').size().reset_index(name='actual_riders_count')
        fact_trip_base = fact_trip_base.merge(rider_counts, left_on='Trip ID', right_on='Trip ID', how='left')
        fact_trip_base['actual_riders_count'] = fact_trip_base['actual_riders_count'].fillna(0).astype(int)
        
        # Add data quality flags
        fact_trip_base['data_quality_flag'] = 'OK'
        fact_trip_base['passenger_mismatch_flag'] = False
        
        # Flag trips with no riders
        no_riders = fact_trip_base['actual_riders_count'] == 0
        fact_trip_base.loc[no_riders, 'data_quality_flag'] = 'No_Riders'
        
        # Flag trips where actual exceeds booked (impossible)
        over_capacity = fact_trip_base['actual_riders_count'] > fact_trip_base['Total Passengers']
        fact_trip_base.loc[over_capacity, 'data_quality_flag'] = 'Over_Capacity'
        
        # Flag passenger count mismatches
        mismatch = fact_trip_base['actual_riders_count'] != fact_trip_base['Total Passengers']
        fact_trip_base.loc[mismatch, 'passenger_mismatch_flag'] = True
        
        # Calculate utilization rate
        fact_trip_base['utilization_rate'] = (
            fact_trip_base['actual_riders_count'] / fact_trip_base['Total Passengers']
        ).clip(0, 1).round(2)
        
        # Map addresses to surrogate keys
        fact_trip_base['pickup_address_id'] = fact_trip_base['Pick Up Address'].map(self.address_lookup)
        fact_trip_base['dropoff_address_id'] = fact_trip_base['Drop Off Address'].map(self.address_lookup)
        
        # Check for missing address mappings
        missing_pickup = fact_trip_base['pickup_address_id'].isna().sum()
        missing_dropoff = fact_trip_base['dropoff_address_id'].isna().sum()
        if missing_pickup > 0 or missing_dropoff > 0:
            print(f"  ⚠️ WARNING: {missing_pickup} missing pickup addresses, {missing_dropoff} missing dropoff addresses")
            self.data_quality_issues.append({
                'table': 'FACT_TRIP',
                'issue': 'Missing address mappings',
                'count': missing_pickup + missing_dropoff
            })
        
        # Report data quality issues
        quality_issues = fact_trip_base['data_quality_flag'] != 'OK'
        if quality_issues.sum() > 0:
            print(f"  ⚠️ WARNING: {quality_issues.sum()} trips have data quality issues")
            print(f"    - No riders: {no_riders.sum()}")
            print(f"    - Over capacity: {over_capacity.sum()}")
            self.data_quality_issues.append({
                'table': 'FACT_TRIP',
                'issue': 'Data quality flags',
                'count': quality_issues.sum()
            })
        
        mismatch_count = mismatch.sum()
        print(f"  ⚠️ WARNING: {mismatch_count} trips ({mismatch_count/len(fact_trip_base)*100:.1f}%) have passenger count mismatches")
        
        # Create final FACT_TRIP with all enhancements
        self.fact_trip = pd.DataFrame({
            'trip_id': fact_trip_base['Trip ID'],
            'booking_user_id': fact_trip_base['Booking User ID'],
            'pickup_address_id': fact_trip_base['pickup_address_id'],
            'dropoff_address_id': fact_trip_base['dropoff_address_id'],
            'trip_date': fact_trip_base['trip_date'],
            'trip_time': fact_trip_base['trip_time'],
            'day_of_week': fact_trip_base['day_of_week'],
            'hour_of_day': fact_trip_base['hour_of_day'],
            'time_period': fact_trip_base['time_period'],
            'is_weekend': fact_trip_base['is_weekend'],
            'month': fact_trip_base['month'],
            'year': fact_trip_base['year'],
            'booked_passengers': fact_trip_base['Total Passengers'],  # Renamed for clarity
            'actual_riders_count': fact_trip_base['actual_riders_count'],
            'utilization_rate': fact_trip_base['utilization_rate'],
            'data_quality_flag': fact_trip_base['data_quality_flag'],
            'passenger_mismatch_flag': fact_trip_base['passenger_mismatch_flag'],
            'pickup_latitude': fact_trip_base['Pick Up Latitude'],
            'pickup_longitude': fact_trip_base['Pick Up Longitude'],
            'dropoff_latitude': fact_trip_base['Drop Off Latitude'],
            'dropoff_longitude': fact_trip_base['Drop Off Longitude']
        })
        
        print(f"✓ Created FACT_TRIP with {len(self.fact_trip)} trips")
        print(f"  - Date range: {self.fact_trip['trip_date'].min()} to {self.fact_trip['trip_date'].max()}")
        print(f"  - Average utilization rate: {self.fact_trip['utilization_rate'].mean():.2%}")
        
    def create_fact_trip_riders(self):
        """Create FACT_TRIP_RIDERS bridge table with validation"""
        print("\nCreating FACT_TRIP_RIDERS bridge table with validation...")
        
        # Validate that all trips exist
        missing_trips = self.rider_data[~self.rider_data['Trip ID'].isin(self.fact_trip['trip_id'])]
        if len(missing_trips) > 0:
            print(f"  ⚠️ WARNING: {len(missing_trips)} rider records reference non-existent trips")
            self.data_quality_issues.append({
                'table': 'FACT_TRIP_RIDERS',
                'issue': 'Orphaned rider records',
                'count': len(missing_trips)
            })
        
        # Validate that all riders exist
        missing_users = self.rider_data[~self.rider_data['User ID'].isin(self.dim_user['user_id'])]
        if len(missing_users) > 0:
            print(f"  ⚠️ WARNING: {len(missing_users)} rider records reference non-existent users")
            self.data_quality_issues.append({
                'table': 'FACT_TRIP_RIDERS',
                'issue': 'Missing user references',
                'count': len(missing_users)
            })
        
        # Create the bridge table
        self.fact_trip_riders = pd.DataFrame({
            'trip_id': self.rider_data['Trip ID'],
            'rider_user_id': self.rider_data['User ID']
        })
        
        # Check for duplicate entries (same rider on same trip multiple times)
        duplicates = self.fact_trip_riders.duplicated()
        if duplicates.sum() > 0:
            print(f"  ⚠️ WARNING: {duplicates.sum()} duplicate trip-rider pairs found")
            self.data_quality_issues.append({
                'table': 'FACT_TRIP_RIDERS',
                'issue': 'Duplicate entries',
                'count': duplicates.sum()
            })
            # Remove duplicates
            self.fact_trip_riders = self.fact_trip_riders.drop_duplicates()
        
        print(f"✓ Created FACT_TRIP_RIDERS with {len(self.fact_trip_riders)} trip-rider relationships")
        
    def generate_data_quality_report(self):
        """Generate comprehensive data quality report"""
        print("\n" + "="*80)
        print("DATA QUALITY REPORT")
        print("="*80)
        
        print("\n📊 DIMENSIONAL MODEL SUMMARY:")
        print(f"├── DIM_ADDRESS: {len(self.dim_address):,} unique addresses")
        print(f"├── DIM_USER: {len(self.dim_user):,} users") 
        print(f"├── FACT_TRIP: {len(self.fact_trip):,} trips")
        print(f"└── FACT_TRIP_RIDERS: {len(self.fact_trip_riders):,} trip-rider relationships")
        
        print("\n🔍 KEY METRICS:")
        
        # Calculate key business metrics
        avg_riders = self.fact_trip['actual_riders_count'].mean()
        avg_booked = self.fact_trip['booked_passengers'].mean()
        utilization = self.fact_trip['utilization_rate'].mean()
        
        print(f"├── Average riders per trip: {avg_riders:.2f}")
        print(f"├── Average booked passengers: {avg_booked:.2f}")
        print(f"├── Average utilization rate: {utilization:.1%}")
        
        # Data quality metrics
        trips_ok = (self.fact_trip['data_quality_flag'] == 'OK').sum()
        trips_mismatch = self.fact_trip['passenger_mismatch_flag'].sum()
        
        print(f"├── Trips with no issues: {trips_ok} ({trips_ok/len(self.fact_trip):.1%})")
        print(f"└── Trips with passenger mismatch: {trips_mismatch} ({trips_mismatch/len(self.fact_trip):.1%})")
        
        if self.data_quality_issues:
            print("\n⚠️ DATA QUALITY ISSUES SUMMARY:")
            for issue in self.data_quality_issues:
                print(f"├── {issue['table']}: {issue['issue']} ({issue['count']} records)")
        
        print("\n✨ IMPROVEMENTS IN THIS VERSION:")
        print("├── Added data quality flags to identify problematic records")
        print("├── Separated 'booked_passengers' from 'actual_riders_count' for clarity")
        print("├── Added utilization rate calculation")
        print("├── Enhanced address deduplication using composite keys")
        print("├── Improved zipcode standardization")
        print("├── Added age validation with quality flags")
        print("├── Added time period and weekend flags for better analysis")
        print("└── Comprehensive validation at each step")
        
    def save_tables(self, output_dir='output/dimensional_model_fixed'):
        """Save all dimensional model tables as CSV files"""
        print(f"\nSaving enhanced dimensional model tables to {output_dir}/...")
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Save dimension tables (remove internal columns before saving)
        dim_address_output = self.dim_address.drop(['original_address'], axis=1)
        dim_address_output.to_csv(f'{output_dir}/DIM_ADDRESS.csv', index=False)
        print(f"✓ Saved DIM_ADDRESS.csv ({len(dim_address_output):,} records)")
        
        self.dim_user.to_csv(f'{output_dir}/DIM_USER.csv', index=False)
        print(f"✓ Saved DIM_USER.csv ({len(self.dim_user):,} records)")
        
        # Save fact tables
        self.fact_trip.to_csv(f'{output_dir}/FACT_TRIP.csv', index=False)
        print(f"✓ Saved FACT_TRIP.csv ({len(self.fact_trip):,} records)")
        
        self.fact_trip_riders.to_csv(f'{output_dir}/FACT_TRIP_RIDERS.csv', index=False)
        print(f"✓ Saved FACT_TRIP_RIDERS.csv ({len(self.fact_trip_riders):,} records)")
        
        # Save data quality report
        if self.data_quality_issues:
            quality_df = pd.DataFrame(self.data_quality_issues)
            quality_df.to_csv(f'{output_dir}/DATA_QUALITY_ISSUES.csv', index=False)
            print(f"✓ Saved DATA_QUALITY_ISSUES.csv ({len(quality_df):,} issues)")
        
        print(f"\n🎯 Enhanced tables ready for Snowflake upload in '{output_dir}/'")
        
    def transform_all(self):
        """Run complete transformation pipeline with enhancements"""
        print("🚀 Starting Enhanced Dimensional Model Transformation...")
        print("="*80)
        
        self.load_data()
        self.create_dim_address()
        self.create_dim_user()
        self.create_fact_trip()
        self.create_fact_trip_riders()
        self.generate_data_quality_report()
        self.save_tables()
        
        print("\n✅ Enhanced transformation completed successfully!")
        print("📁 Files ready for Snowflake upload in 'output/dimensional_model_fixed/' directory")
        print("\n💡 KEY IMPROVEMENTS:")
        print("  • Passenger count issues are now trackable with separate fields")
        print("  • Data quality flags help filter problematic records")
        print("  • Age validation identifies suspicious data")
        print("  • Better address deduplication reduces redundancy")
        print("  • Utilization metrics enable capacity analysis")


def main():
    transformer = DimensionalModelTransformerFixed()
    transformer.transform_all()

if __name__ == "__main__":
    main()
