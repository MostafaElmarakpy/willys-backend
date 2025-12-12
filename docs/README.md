# 📚 Willy's Backend Documentation

Welcome to the Willy's Restaurant Backend API documentation. This directory contains comprehensive guides, API references, and technical documentation.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [API Documentation](#api-documentation) 
- [Architecture](#architecture)
- [Postman Collection](#postman-collection)

## 🛠️ Development Setup

### Running the Development Environment

1. **Start Development Services**
   ```bash
   # Start PostgreSQL database with PostGIS
   docker compose -f docker-compose.dev.yml up -d
   
   # Start the application in development mode
   npm run start:dev
   ```

2. **Database Operations**
   ```bash
   # Run database migrations
   npm run migrate
   
   # Access TypeORM CLI for development
   npm run typeorm
   ```

3. **Seeding Data**
   ```bash
   # Run database seeders (if available)
   npm run seed
   ```

4. **Code Quality Commands**
   ```bash
   # Run linting with auto-fix
   npm run lint
   
   # Format code
   npm run format
   
   # Run tests
   npm test
   ```

### Database Information
- **Database**: PostgreSQL with PostGIS extension
- **Development Port**: 5433 (mapped from container port 5432)
- **Migrations**: Located in `src/database/migrations/`
- **Entities**: Located in `src/database/entities/`

### Environment Setup
Make sure to configure your environment variables. See `src/config/config.service.ts` for required variables including:
- PORT, DATABASE_*, JWT_*, S3_*, POSTGRES_*, ROUND_CUBE_*

## 🚀 API Documentation

### Core APIs
- **[Menu Management API](./api/menu-management.md)** - Complete menu system with categories, items, variants, and ingredients
- **[Branches & Zones API](./api/branches-zones.md)** - Restaurant management with delivery zones
- **Authentication API** - JWT-based user authentication
- **Users API** - User profile and admin operations
- **Upload Media API** - File management with AWS S3

## 🏗️ Architecture

- **[System Overview](./architecture/system-overview.md)** - Complete architecture documentation

## 📮 Postman Collection

- **[API Collection](./postman/Willys-Backend.postman_collection.json)** - Complete Postman collection with automated token handling

## 📁 Documentation Structure

```
docs/
├── README.md                                    # Documentation index
├── api/
│   ├── menu-management.md                      # Menu management API reference
│   └── branches-zones.md                       # Branches & zones API reference
├── architecture/system-overview.md             # System architecture
├── postman/Willys-Backend.postman_collection.json  # Postman collection
└── MIGRATION_SUMMARY.md                        # Database migrations
```