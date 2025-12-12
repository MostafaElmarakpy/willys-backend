# 📚 Willy's Backend Documentation

Welcome to the Willy's Restaurant Backend API documentation. This directory contains comprehensive guides, API references, and technical documentation.

## 📋 Table of Contents

- [API Documentation](#api-documentation) 
- [Architecture](#architecture)
- [Postman Collection](#postman-collection)

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