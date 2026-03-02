.PHONY: up down demo demo-interactive logs clean test rebuild setup

# Install Python dependencies for demo script
setup:
	pip install -q -r requirements.txt
	@echo "✅ Dependencies installed"

# Start all services
up: setup
	docker-compose up -d
	@echo ""
	@echo "✅ Services started!"
	@echo "   Hub:     http://localhost:5001/docs"
	@echo "   Store 1: http://localhost:5002/docs"
	@echo "   Store 2: http://localhost:5003/docs"
	@echo ""
	@echo "Run 'make demo' to test the system"

# Stop all services
down:
	docker-compose down
	@echo "✅ Services stopped"

# Stop containers and reset (keeps volumes but clears databases)
reset:
	docker-compose down
	find . -name "*.db" -delete
	@echo "✅ Reset (databases cleared, ready for fresh demo)"

# Remove containers, images, and volumes (full cleanup)
clean:
	docker-compose down -v
	docker rmi distributed-prototype-hub distributed-prototype-store 2>/dev/null || true
	find . -name "*.db" -delete
	@echo "✅ Fully cleaned up"

# View logs
logs:
	docker-compose logs -f

# View logs for specific service
logs-hub:
	docker-compose logs -f hub

logs-store1:
	docker-compose logs -f store_1

logs-store2:
	docker-compose logs -f store_2

# Run the demo script
demo:
	python demo.py

# Run the interactive demo script
demo-interactive:
	python interactive_demo.py

# Rebuild images (after code changes)
rebuild:
	docker-compose down
	docker-compose up --build -d
	@echo "✅ Rebuilt and started"

# Run tests (stub for future)
test:
	@echo "No automated tests yet. Use 'make demo' or test manually with Swagger UI."

# Show quick status
status:
	@echo "=== Container Status ==="
	@docker-compose ps
	@echo ""
	@echo "=== Hub Store Registry ==="
	@curl -s http://localhost:5001/api/hub/stores/ | python -m json.tool || echo "Hub not responding"

# Shortcuts
restart: down up
full-restart: clean up
