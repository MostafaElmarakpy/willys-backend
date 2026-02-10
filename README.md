```markdown
# Willy's Backend

[![GitHub Repo](https://img.shields.io/badge/GitHub-WillysBackend-blue?logo=github)](https://github.com/MostafaElmarakpy/willys-backend)

## 📝 Project Overview & Purpose

**Willy's Backend** is a scalable, extensible backend API built for managing data, authentication, and operations for a modern business application. Using **NestJS** and **Clean Architecture**, the project ensures maintainability, flexibility, and secure integration for client-side applications. It provides robust support for authentication, product and category management, and role-based access control.

---

## ✨ Key Features

- **JWT-based Authentication** with support for refresh tokens
- Complete Product CRUD operations
- Category management with product-category associations
- Role-based access control (Admin/User)
- Database seeding and migration capabilities
- Swagger documentation for API exploration
- CORS configuration for secure frontend integration
- Repository and Unit of Work design patterns
- Dockerized development and production setups

---

## 🛠️ Technical Stack & Dependencies

### **Frameworks & Runtimes**
- **NestJS**: 11.x (Node.js framework for scalable backend)
- **TypeScript**: Typed JavaScript for maintainable codebase

### **Database**
- **PostgreSQL**: Relational database
- **PostGIS**: Extension for geospatial data

### **Authentication**
- **@nestjs/jwt**: JWT Authentication
- **bcrypt**: Password hashing and validation

### **Documentation & Utilities**
- **Swagger**: API Documentation via `@nestjs/swagger`
- **Class-validator**: Validation for DTOs

### **Testing**
- **Jest**: Unit and integration testing
- **Supertest**: HTTP assertions

### **Containerization**
- Docker & Docker Compose for consistent environments

---

## 🗂️ Project Structure

```plaintext
willys-backend/
├── src/
│   ├── authentication/    # JWT authentication module
│   ├── common/            # Shared modules (utilities, decorators)
│   ├── config/            # Application configuration
│   ├── database/          # Entities, migrations, and seeders
│   ├── modules/           # Feature modules (products, categories, etc.)
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   ├── main.ts            # Application bootstrap
├── test/                  # Unit and integration test files
├── docker-compose.yml     # Docker setup
├── README.md              # Project documentation
└── package.json           # Dependencies and scripts
```

---

## 📡 API Endpoints

> **For full details, visit the Swagger docs at `/swagger`**

### **Authentication**
- `POST /api/auth/login` — Logs in a user, returns JWT
- `POST /api/auth/register` — Registers a new user
- `POST /api/auth/refresh-token` — Refreshes the expired JWT

### **Products**
- `GET /api/products` — Fetch all products
- `GET /api/products/:id` — Fetch product by ID
- `POST /api/products/` — Create a new product
- `PUT /api/products/:id` — Update product by ID
- `DELETE /api/products/:id` — Delete a product by ID

### **Categories**
- `GET /api/categories` — Fetch all categories
- `POST /api/categories` — Create a new category
- `PUT /api/categories/:id` — Update category by ID
- `DELETE /api/categories/:id` — Delete a category by ID

---

## 🚀 Installation & Running

### 1. Clone the Repository
```bash
git clone https://github.com/MostafaElmarakpy/willys-backend.git
cd willys-backend
```

### 2. Configure Environment
Create an `.env` file based on `.env.example`, and configure the following:
```env
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/willys_db
JWT_SECRET=your_secret_key
JWT_EXPIRATION=3600
```

### 3. Start the Application

For development:
```bash
npm install
npm run start:dev
```

For production:
```bash
docker-compose up --build
```

- API runs at: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/swagger`

---

## 🧩 Dependencies

Core project dependencies:
- **@nestjs/core**: Framework core
- **@nestjs/typeorm**: ORM integration for NestJS
- **class-validator**: Validation for DTOs
- **Swagger**: API documentation
- **bcrypt**: Password hashing

Testing dependencies:
- **Jest**: Unit testing
- **Supertest**: End-to-end HTTP testing

---

## 🗺️ Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    AppUser ||--o{ RefreshToken : "User refresh tokens"
    AppUser ||--o{ Product : "Created products"
    Product }o--|| Category : "Belongs to Category"

    AppUser {
        string id PK
        string username
        string email
        string password
    }
    Category {
        int id PK
        string name
        string description
    }
    Product {
        int id PK
        string name
        double price
        int categoryId FK
    }
    RefreshToken {
        int id PK
        string token
        datetime expiryDate
        string userId FK
    }
```

---

## 🏗️ Design Patterns Overview

1. **Repository Pattern**:
   - Abstracts data access and provides a clear contract for database operations.
   - Example: `GenericRepository<T>` for CRUD and custom queries.

2. **Unit of Work Pattern**:
   - Manages transactions and ensures changes are committed atomically.

3. **Dependency Injection (DI)**:
   - All services, modules, and components are centralized into the service container.

4. **Clean Architecture**:
   - Separation of layers:
     - **Domain**: Core business logic
     - **Application**: Use case coordination
     - **Infrastructure**: Database access and external dependencies
     - **Presentation**: API layer

5. **DTOs & Mapping**:
   - Data Transfer Objects ensure well-defined payloads between layers.

---

## 🔎 Visual Summary

```mermaid
flowchart TD
    Client["Client (Frontend)"]
        -->|HTTP| API["API Gateway (NestJS)"]
    API -->|Calls| Service["Application Layer"]
    Service -->|Executes| Infrastructure["Infrastructure (Repositories, Database)"]
    Infrastructure -->|Data| Database["PostgreSQL + PostGIS"]
```

## 📣 Additional Notes

### **Future Enhancements**
- Support for third-party payment integration
- GraphQL API support
- More detailed logging and observability

### **Frontend Compatibility**
- Works seamlessly with modern SPAs (React, Angular, Vue)

---
Let me know if there’s anything more you’d like to add or adjust!
```
