# 🏗️ System Architecture

## Stack Overview
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with PostGIS
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3
- **Internationalization**: Arabic/English support
- **Audit Trail**: Automatic user tracking

## Core Modules

### Authentication Module
- JWT-based authentication
- User registration/login
- Token management (access/refresh)
- Device tracking

### Users Module
- User profile management
- Admin user operations
- Role-based access control

### Branches Module
- Restaurant branch management
- Geospatial delivery zones
- Order routing logic
- Bilingual naming support

### Upload Media Module
- AWS S3 file uploads
- Entity-based file association
- Image/document management

## Database Schema

### Core Entities
```
users (id, fullName, email, role, status...)
├── access_tokens (JWT session management)
├── reset_password_tokens (password recovery)
└── upload_media (file associations)

branches (id, name{en,ar}, location, settings...)
├── zones (polygon delivery areas)
├── createdBy/updatedBy → users
└── audit trail fields

zones (id, name{en,ar}, polygon, branch_id...)
├── branchId → branches
├── createdBy/updatedBy → users
└── geospatial polygon data
```

## Key Features

### Geospatial Support
- PostGIS for location queries
- Polygon-based delivery zones
- Point-in-polygon detection
- Distance calculations

### Internationalization
- Bilingual content (Arabic/English)
- JSONB storage for names
- Language-specific API responses

### Audit Trail
- Automatic createdBy/updatedBy tracking
- TypeORM subscribers for all entities
- Request context user detection

### Security
- JWT authentication required
- Rate limiting (1000 req/15min)
- Input validation & sanitization
- CORS enabled