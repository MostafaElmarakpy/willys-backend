# Willy's Backend

## Environment Setup

### Development
```bash
# Start development environment
docker compose -f docker-compose.dev.yml up

# Run migrations in development
npm run migrate
# Run seeders in development
npm run seed
```

### Staging
```bash
# Start staging environment
docker compose -f docker-compose.staging.yml up

# Run migrations in staging
docker compose -f docker-compose.staging.yml exec willys-backend yarn migrate:prod

# Run seeders in staging (Note: Currently has entity relationship issues)
docker-compose exec willys-backend yarn seed:prod
```

### Production
```bash
# Start production environment
docker compose -f docker-compose.yml up

# Run migrations in production
docker compose exec willys-backend yarn migrate:prod

# Run seeders in production (Note: Currently has entity relationship issues)
docker compose exec willys-backend yarn seed:prod
```
## Environment Files

- `.env` - Contains all environment variables for all environments
- `docker-compose.dev.yml` - Development environment with hot reload
- `docker-compose.staging.yml` - Staging environment without Traefik
- `docker-compose.yml` - Production environment with Traefik

## Architecture

NestJS backend with PostgreSQL database and PostGIS extension for geospatial data.