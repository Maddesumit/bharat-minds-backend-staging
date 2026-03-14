import os
import time
import pandas as pd
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Appwrite Configuration
APPWRITE_ENDPOINT = os.getenv('APPWRITE_ENDPOINT')
APPWRITE_PROJECT_ID = os.getenv('APPWRITE_PROJECT_ID')
APPWRITE_API_KEY = os.getenv('APPWRITE_API_KEY')
APPWRITE_DATABASE_ID = os.getenv('APPWRITE_DATABASE_ID')
COLLECTION_ID = 'colleges_info'

def get_appwrite_data():
    client = Client()
    client.set_endpoint(APPWRITE_ENDPOINT)
    client.set_project(APPWRITE_PROJECT_ID)
    client.set_key(APPWRITE_API_KEY)
    
    databases = Databases(client)
    
    colleges = []
    cursor = None
    
    print("Fetching colleges from Appwrite...")
    while True:
        queries = [Query.limit(100)]
        if cursor:
            queries.append(Query.cursor_after(cursor))
        
        # Result is a dictionary in the python SDK
        result = databases.list_documents(
            database_id=APPWRITE_DATABASE_ID,
            collection_id=COLLECTION_ID,
            queries=queries
        )
        
        batch = result['documents']
        if not batch:
            break
            
        colleges.extend(batch)
        cursor = batch[-1]['$id']
        print(f"Fetched {len(colleges)} colleges...")
        
        if len(batch) < 100:
            break
            
    return colleges

def geocode_address(geolocator, query, delay=1):
    try:
        time.sleep(delay)
        location = geolocator.geocode(query, timeout=10)
        return location
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        print(f"Error geocoding {query}: {e}")
        return None

def main():
    colleges = get_appwrite_data()
    
    geolocator = Nominatim(user_agent="bharat_minds_geocoder")
    results = []
    
    print(f"Starting geocoding for {len(colleges)} colleges...")
    
    for college in colleges:
        name = college.get('collegename')
        code = college.get('collegecode')
        address = college.get('Address')
        city = college.get('City')
        district = college.get('District')
        
        existing_lat = college.get('latitude')
        existing_lng = college.get('longitude')
        
        if existing_lat and existing_lng:
            print(f"Skipping {name} ({code}) - already has coordinates.")
            results.append({
                'collegeCode': code,
                'collegeName': name,
                'latitude': existing_lat,
                'longitude': existing_lng,
                'geocodingStatus': 'success'
            })
            continue

        print(f"Geocoding {name} ({code})...")
        
        location = None
        status = 'failed'
        
        # Strategy 1: Full Address
        if address:
            query = f"{address}, {city}, {district}, India"
            location = geocode_address(geolocator, query)
            if location:
                status = 'success'
        
        # Strategy 2: College Name + City + District
        if not location and name and city:
            query = f"{name}, {city}, {district}, India"
            location = geocode_address(geolocator, query)
            if location:
                status = 'partial'
                
        # Strategy 3: City + District
        if not location and city and district:
            query = f"{city}, {district}, India"
            location = geocode_address(geolocator, query)
            if location:
                status = 'partial'
                
        if location:
            print(f"  Result: {location.latitude}, {location.longitude} ({status})")
            results.append({
                'collegeCode': code,
                'collegeName': name,
                'latitude': location.latitude,
                'longitude': location.longitude,
                'geocodingStatus': status
            })
        else:
            print(f"  Failed to geocode {name}")
            results.append({
                'collegeCode': code,
                'collegeName': name,
                'latitude': None,
                'longitude': None,
                'geocodingStatus': 'failed'
            })

    # Save to CSV
    os.makedirs('data', exist_ok=True)
    df = pd.DataFrame(results)
    output_path = 'data/college-coordinates.csv'
    df.to_csv(output_path, index=False)
    print(f"\nGeocoding complete. Results saved to {output_path}")
    
    # Summary
    print("\nSummary:")
    print(df['geocodingStatus'].value_counts())

if __name__ == "__main__":
    main()
