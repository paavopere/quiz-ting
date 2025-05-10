import json
import time
import sys
import os
from firebase_admin import credentials, firestore, initialize_app

def main():
    # Check for service account file
    if len(sys.argv) < 2:
        print("Usage: python upload_firebase.py path/to/service-account.json")
        return 1

    service_account_path = os.path.expanduser(sys.argv[1])
    if not os.path.exists(service_account_path):
        print(f"Error: Service account file not found: {service_account_path}")
        return 1

    # Use default JSON path or specified one
    json_path = sys.argv[2] if len(sys.argv) > 2 else "data/cities5000.min.json"
    if not os.path.exists(json_path):
        print(f"Error: Cities JSON file not found: {json_path}")
        return 1

    # Initialize Firebase
    print(f"Initializing Firebase with service account: {service_account_path}")
    cred = credentials.Certificate(service_account_path)
    initialize_app(cred)
    db = firestore.client()
    
    # Load cities from JSON
    print(f"Loading cities from: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        cities = json.load(f)
        
    print(f"Loaded {len(cities)} cities")
    
    # Upload in batches
    batch_size = 400
    total_batches = (len(cities) + batch_size - 1) // batch_size
    
    start_time = time.time()
    
    for i in range(total_batches):
        start_idx = i * batch_size
        end_idx = min(start_idx + batch_size, len(cities))
        current_batch = cities[start_idx:end_idx]
        
        print(f"Processing batch {i+1}/{total_batches} with {len(current_batch)} cities")
        
        # Create a batch
        batch = db.batch()
        
        for city in current_batch:
            # Use Firestore's auto-generated ID
            doc_ref = db.collection('cities').document()
            batch.set(doc_ref, city)
        
        # Commit the batch with exponential backoff
        backoff = 1  # Initial backoff in seconds
        max_backoff = 64  # Maximum backoff time
        while True:
            try:
                print(f"Committing batch {i+1}/{total_batches}...")
                batch.commit()
                print(f"Batch {i+1}/{total_batches} committed successfully")
                break  # Exit the retry loop on success
            except Exception as e:
                print(f"Error committing batch {i+1}: {e}")
                if backoff > max_backoff:
                    print("Max backoff time exceeded. Aborting.")
                    raise  # Let the exception propagate
                print(f"Retrying batch {i+1} in {backoff} seconds...")
                time.sleep(backoff)
                backoff *= 2  # Exponential backoff
        
        # Small delay to avoid rate limits between batches
        if i < total_batches - 1:
            time.sleep(1)
    
    elapsed_time = time.time() - start_time
    print(f"Upload completed in {elapsed_time:.2f} seconds!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
