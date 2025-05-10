# Configuration
ZIP_URL = http://download.geonames.org/export/dump/cities5000.zip
DATA_DIR = data
ZIP_FILE = $(DATA_DIR)/cities5000.zip
TSV_FILE = $(DATA_DIR)/cities5000.txt
JSON_OUTPUT = $(DATA_DIR)/cities5000.json
JSON_MIN_OUTPUT = $(DATA_DIR)/cities5000.min.json
CITY_LIMIT = 1000000

# Default target - now includes minification
all: $(JSON_MIN_OUTPUT)

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

# Minify the JSON
$(JSON_MIN_OUTPUT): $(JSON_OUTPUT)
	@echo "Minifying JSON..."
	@if command -v jq >/dev/null 2>&1; then \
		jq -c '.' $(JSON_OUTPUT) > $(JSON_MIN_OUTPUT); \
		echo "Original size: $$(du -h $(JSON_OUTPUT) | cut -f1)"; \
		echo "Minified size: $$(du -h $(JSON_MIN_OUTPUT) | cut -f1)"; \
	else \
		echo "Warning: jq not found, creating a copy instead"; \
		cp $(JSON_OUTPUT) $(JSON_MIN_OUTPUT); \
	fi

# Clean up
clean:
	@echo "Cleaning up..."
	@rm -f $(ZIP_FILE) $(TSV_FILE) $(JSON_OUTPUT) $(JSON_MIN_OUTPUT)

clean-all:
	@echo "Removing data directory..."
	@rm -rf $(DATA_DIR)

.PHONY: all clean clean-all
