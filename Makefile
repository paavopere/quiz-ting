# Configuration
ZIP_URL = http://download.geonames.org/export/dump/cities5000.zip
DATA_DIR = data
ZIP_FILE = $(DATA_DIR)/cities5000.zip
TSV_FILE = $(DATA_DIR)/cities5000.txt
JSON_OUTPUT = $(DATA_DIR)/cities5000.json
CITY_LIMIT = 1000000

# Default target
all: $(JSON_OUTPUT)

# Create data directory if it doesn't exist
$(DATA_DIR):
	@echo "Creating data directory..."
	@mkdir -p $(DATA_DIR)

# Download the zip file
$(ZIP_FILE): $(DATA_DIR)
	@echo "Downloading $(ZIP_FILE)..."
	@curl -o $(ZIP_FILE) $(ZIP_URL)

# Extract the TSV file
$(TSV_FILE): $(ZIP_FILE)
	@echo "Extracting $(TSV_FILE)..."
	@unzip -o $(ZIP_FILE) -d $(DATA_DIR)

# Convert to JSON
$(JSON_OUTPUT): $(TSV_FILE)
	@echo "Converting to JSON..."
	@python3 convert_to_json.py $(TSV_FILE) $(JSON_OUTPUT) $(CITY_LIMIT)

# Clean up
clean:
	@echo "Cleaning up..."
	@rm -f $(ZIP_FILE) $(TSV_FILE) $(JSON_OUTPUT)

clean-all:
	@echo "Removing data directory..."
	@rm -rf $(DATA_DIR)

.PHONY: all clean clean-all
