# Configuration
ZIP_URL = http://download.geonames.org/export/dump/cities5000.zip
ZIP_FILE = cities5000.zip
TSV_FILE = cities5000.txt
JSON_OUTPUT = cities5000.json
CITY_LIMIT = 1000000

# Default target
all: $(JSON_OUTPUT)

# Download the zip file
$(ZIP_FILE):
	@echo "Downloading $(ZIP_FILE)..."
	@curl -o $(ZIP_FILE) $(ZIP_URL)

# Extract the TSV file
$(TSV_FILE): $(ZIP_FILE)
	@echo "Extracting $(TSV_FILE)..."
	@unzip -o $(ZIP_FILE) $(TSV_FILE)

# Convert to JSON
$(JSON_OUTPUT): $(TSV_FILE)
	@echo "Converting to JSON..."
	@python3 convert_to_json.py $(TSV_FILE) $(JSON_OUTPUT) $(CITY_LIMIT)

# Clean up
clean:
	@echo "Cleaning up..."
	@rm -f $(ZIP_FILE) $(TSV_FILE) $(JSON_OUTPUT)

.PHONY: all clean
