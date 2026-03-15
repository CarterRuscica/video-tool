.PHONY: dev dev-docker build test test-backend test-frontend lint schema clean

dev:
	cd frontend && npm install
	cd frontend && npm run tauri dev

dev-docker:
	docker compose up --build

build:
	cd frontend && npm install
	cd frontend && npm run tauri build

test: test-backend test-frontend

test-backend:
	cd backend && python -m pytest tests/ -v

test-frontend:
	cd frontend && npx vitest run

lint:
	cd frontend && npx tsc --noEmit
	cd backend && python -m ruff check src/ tests/

schema:
	@echo "Generating TypeScript types from shared/schema.json..."
	node scripts/generate-ts-types.js
	@echo "Generating Pydantic models from shared/schema.json..."
	python scripts/generate_pydantic.py
	@echo "Schema generation complete."

clean:
	rm -rf frontend/dist frontend/node_modules
	rm -rf src-tauri/target
	find backend -type d -name __pycache__ -exec rm -rf {} +
