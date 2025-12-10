# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- **Start development**: `npm run start:dev` or `yarn start:dev`
- **Build**: `npm run build` or `yarn build`
- **Start production**: `npm run start:prod` or `yarn start:prod`

### Code Quality
- **Lint**: `npm run lint` (with auto-fix) or `npm run lint:check` (check-only)
- **Format**: `npm run format` (auto-format) or `npm run format:check` (check-only)

### Testing
- **Run tests**: `npm test` or `yarn test`
- **Watch tests**: `npm run test:watch` or `yarn test:watch`
- **Test coverage**: `npm run test:cov` or `yarn test:cov`
- **E2E tests**: `npm run test:e2e` or `yarn test:e2e`

### Database Operations
- **Run migrations**: `npm run migrate` (development with Docker) or `npm run migrate:prod` (production)
- **TypeORM CLI**: `npm run typeorm` (development) or `npm run typeorm:prod` (production)

### Docker Operations
- **Development**: Use `docker-compose.dev.yml`
- **Production**: Use `docker-compose.yml`
- **Database**: PostgreSQL with PostGIS extension on port 5433

## Architecture Overview

### Core Framework
- **NestJS**: TypeScript Node.js framework with modular architecture
- **TypeORM**: Database ORM with PostgreSQL/PostGIS
- **Docker**: Containerized development and deployment

### Key Modules
- **Authentication**: JWT-based auth with access/refresh tokens (`src/authentication/`)
- **Users**: User management (`src/modules/users/`)
- **Upload Media**: File upload with AWS S3 integration (`src/services/upload-media/`)
- **Database**: Entity definitions and migrations (`src/database/`)

### Configuration
- **Environment-based**: All config via environment variables (see `ConfigService` at `src/config/config.service.ts`)
- **Required variables**: PORT, DATABASE_*, JWT_*, S3_*, POSTGRES_*, ROUND_CUBE_*
- **Custom ConfigService**: Validates required environment variables on startup

### Security & Middleware
- **Rate limiting**: 1000 requests per 15 minutes (configurable)
- **Helmet**: Security headers
- **CORS**: Enabled for all origins
- **Validation**: Global validation pipes with class-validator
- **Internationalization**: Multi-language support via nestjs-i18n

### API Structure
- **Versioned APIs**: `/api/v1/` prefix (default v1)
- **Health checks**: Available via Terminus module
- **File uploads**: 150MB limit for request bodies
- **Throttling**: 10 requests per minute per endpoint

### Database Setup
- **PostgreSQL**: With PostGIS extension for geospatial data
- **Connection**: Port 5433 (mapped from container 5432)
- **Migrations**: Located in `src/database/migrations/`
- **Entities**: Located in `src/database/entities/`

### Development Notes
- **Hot reload**: Available in development mode (`start:dev`)
- **Debugging**: Use `start:debug` for debug mode
- **Linting**: ESLint with Prettier integration
- **Testing**: Jest with coverage reporting

### Documentation
- **Location**: All project documentation is located in the `docs/` directory
- **Structure**: Organized by category (api/, guides/, architecture/, examples/)
- **Main Index**: See `docs/README.md` for complete documentation overview