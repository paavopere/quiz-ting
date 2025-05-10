#!/usr/bin/env python3
import csv
import json
import sys

def convert_to_json(tsv_file, json_file, limit=1000):
    cities = []
    
    # Field indices in GeoNames TSV
    # 0: geonameid
    # 1: name
    # 4: latitude
    # 5: longitude
    # 8: country code
    # 14: population
    
    with open(tsv_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')
        for row in reader:
            try:
                # Make sure we have enough columns
                if len(row) < 15:
                    print(f"Skipping row with insufficient columns: {row}")
                    continue
                
                # Try to convert population to int, handle non-numeric values
                try:
                    population = int(row[14])
                except (ValueError, IndexError):
                    # Skip cities with invalid or missing population data
                    print(f"Skipping city with invalid population: {row[1]}")
                    continue
                
                # Skip cities with very small population
                if population < 5000:
                    continue
                
                city = {
                    "name": row[1],
                    "country": row[8],
                    "population": population,
                    "lat": float(row[4]),
                    "lon": float(row[5])
                }
                cities.append(city)
            except Exception as e:
                print(f"Error processing row: {e}")
                continue
    
    # Sort cities by population (descending)
    cities.sort(key=lambda x: x["population"], reverse=True)
    
    # Limit to top cities if needed
    top_cities = cities[:limit]
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(top_cities, f, ensure_ascii=False, indent=2)
    
    print(f"Converted {len(top_cities)} cities to JSON format in {json_file}")

if __name__ == "__main__":
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print("Usage: python convert_to_json.py <input_tsv> <output_json> [limit]")
        sys.exit(1)
    
    tsv_file = sys.argv[1]
    json_file = sys.argv[2]
    
    # Get optional limit parameter
    limit = 1000  # Default limit
    if len(sys.argv) == 4:
        try:
            limit = int(sys.argv[3])
        except ValueError:
            print(f"Invalid limit value: {sys.argv[3]}. Using default limit of 1000.")
    
    convert_to_json(tsv_file, json_file, limit)
