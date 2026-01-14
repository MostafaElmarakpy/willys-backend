# E2E Testing Guide

This directory contains end-to-end tests for the Willys backend application.

## Architecture

The E2E test suite uses:
- **Docker PostgreSQL** container for isolated test database
- **Real database operations** (no mocks) for authentic testing
- **Test fixtures and factories** for consistent test data
- **Journey-based tests** covering complete user flows

## Structure

```
test/
├── setup/              # Test infrastructure
│   ├── global-setup.ts      # Start DB, run migrations
│   ├── global-teardown.ts   # Clean up test environment
│   ├── test-app.ts          # NestJS app bootstrap for tests
│   └── jest-setup.ts        # Jest configuration
├── helpers/            # Test utilities
│   ├── auth.helper.ts       # Authentication helpers
│   ├── request.helper.ts    # HTTP request wrappers
│   └── token.helper.ts      # JWT token utilities
├── factories/          # Test data generation
│   ├── user.factory.ts
│   ├── address.factory.ts
│   ├── branch.factory.ts
│   ├── menu.factory.ts
│   ├── cart.factory.ts
│   ├── order.factory.ts
│   └── discount.factory.ts
├── fixtures/           # Predefined test data
│   ├── users.fixture.ts
│   ├── branches.fixture.ts
│   └── menu.fixture.ts
└── journeys/           # E2E test suites
    ├── customer/       # Customer journey tests (8 suites)
    ├── admin/          # Admin journey tests (6 suites)
    ├── guest/          # Guest browsing tests (1 suite)
    └── multi-user/     # Concurrency tests (2 suites)
```

## Running Tests

### Prerequisites

1. Docker installed and running
2. Node.js and Yarn installed
3. Project dependencies installed (`yarn install`)

### Start Test Database

```bash
yarn test:db:up
```

This starts a PostgreSQL container on port 5434 with:
- Database: `willys_test`
- User: `willys_test`
- Password: `test_password`

### Run All E2E Tests

```bash
yarn test:e2e
```

### Run Specific Test Suites

```bash
# Customer journey tests
yarn test:e2e -- --testPathPattern=customer

# Admin journey tests
yarn test:e2e -- --testPathPattern=admin

# Guest browsing tests
yarn test:e2e -- --testPathPattern=guest

# Multi-user tests
yarn test:e2e -- --testPathPattern=multi-user

# Specific test file
yarn test:e2e -- --testPathPattern=registration
```

### Watch Mode

```bash
yarn test:e2e:watch
```

### With Coverage

```bash
yarn test:e2e -- --coverage
```

### Stop Test Database

```bash
yarn test:db:down
```

## Test Categories

### Customer Journeys (8 suites)
1. **Registration & Authentication** - User signup, login, password reset
2. **Browse Menu** - Public menu browsing, categories, items
3. **Cart Management** - Add/update/remove items, variants, extras
4. **Checkout - Delivery** - Complete delivery order flow
5. **Checkout - Pickup** - Complete pickup order flow
6. **Order Tracking** - View order status, cancel orders
7. **Order History** - List past orders, filter, reorder
8. **Full Customer Journey** - End-to-end happy path

### Admin Journeys (6 suites)
1. **Menu Management** - CRUD operations for menu items
2. **Branch Management** - Manage branches and delivery zones
3. **Order Management** - Process orders through lifecycle
4. **Discount Management** - Create and manage discounts
5. **User Management** - Admin user operations
6. **Full Admin Journey** - Complete admin workflow

### Guest & Multi-User (3 suites)
1. **Guest Browsing** - Unauthenticated menu access
2. **Concurrent Orders** - Multiple simultaneous checkouts
3. **Discount Race Conditions** - Limited discount usage

## Test Data Management

### Factories
Use factories to generate realistic test data:

```typescript
import { createUser, createCustomer, createAdmin } from './factories/user.factory';
import { createBranch, createZone } from './factories/branch.factory';
import { createItem, createBundle } from './factories/menu.factory';

// Create test data
const admin = await createAdmin({ email: 'admin@test.com' });
const customer = await createCustomer();
const branch = await createBranch(admin);
```

### Fixtures
Use fixtures for consistent, predefined test data:

```typescript
import { createTestUsers } from './fixtures/users.fixture';
import { createTestBranches } from './fixtures/branches.fixture';
import { createTestMenu } from './fixtures/menu.fixture';

// Setup standard test environment
const { customer, admin } = await createTestUsers();
const { mainBranch, zones } = await createTestBranches(admin);
const menu = await createTestMenu(admin);
```

### Database Cleanup
Each test suite automatically:
- Starts with a clean database (via `beforeEach`)
- Truncates all tables between tests
- Maintains referential integrity

## Test Helpers

### Authentication

```typescript
import { registerUser, loginUser, getAuthToken } from './helpers/auth.helper';

// Register new user
const { user, tokens } = await registerUser(app, {
  fullName: 'Test User',
  email: 'test@test.com',
  password: 'Test@1234',
});

// Login existing user
const { tokens } = await loginUser(app, {
  identifier: 'test@test.com',
  password: 'Test@1234',
});
```

### HTTP Requests

```typescript
import { authenticatedPost, authenticatedGet, publicGet } from './helpers/request.helper';

// Authenticated request
const response = await authenticatedPost(
  app,
  '/cart/items',
  tokens.access_token,
  { itemId: '123', quantity: 2 }
);

// Public request
const response = await publicGet(app, '/branches');
```

## Environment Variables

Test environment uses:
- `DATABASE_HOST`: localhost
- `DATABASE_PORT`: 5434
- `DATABASE_NAME`: willys_test
- `DATABASE_USERNAME`: willys_test
- `DATABASE_PASSWORD`: test_password
- `JWT_SECRET`: test_secret_key_for_e2e_tests
- `NODE_ENV`: test

External services are mocked with test credentials.

## Debugging Tests

### Enable Verbose Logging

Uncomment console suppression in `jest-setup.ts`:

```typescript
// Comment out to see logs
// global.console = {
//   ...console,
//   log: jest.fn(),
// };
```

### Run Single Test

```bash
yarn test:e2e -- --testNamePattern="should complete full customer journey"
```

### Inspect Test Database

While tests are running, connect to the test database:

```bash
docker exec -it willys-test-db psql -U willys_test -d willys_test
```

## CI/CD Integration

The test suite is CI/CD ready:

1. Docker Compose manages database lifecycle
2. Global setup/teardown handles infrastructure
3. Tests run sequentially to avoid conflicts
4. Coverage reports can be generated

Example GitHub Actions workflow:

```yaml
- name: Start test database
  run: yarn test:db:up

- name: Run E2E tests
  run: yarn test:e2e --coverage

- name: Stop test database
  run: yarn test:db:down
```

## Troubleshooting

### Port Already in Use
If port 5434 is already in use:
```bash
docker ps | grep 5434
docker stop <container-id>
yarn test:db:down
```

### Migrations Not Running
Ensure project is built before tests:
```bash
yarn build
yarn test:e2e
```

### Tests Hanging
Check database connectivity:
```bash
docker logs willys-test-db
```

### Database Not Clean
Manually reset:
```bash
yarn test:db:down
yarn test:db:up
```

## Best Practices

1. **Use factories** for dynamic test data
2. **Use fixtures** for consistent base data
3. **Clean database** between tests
4. **Test real workflows** not individual endpoints
5. **Handle async operations** properly
6. **Mock external services** (payment gateways, email)
7. **Test edge cases** and error conditions
8. **Keep tests independent** and idempotent

## Contributing

When adding new tests:

1. Follow existing patterns in test/journeys/
2. Use helpers and factories
3. Clean up test data properly
4. Document complex test scenarios
5. Ensure tests pass in isolation and as suite

## Test Coverage Goals

- **Customer flows**: 100% (critical path)
- **Admin operations**: 90%+
- **Edge cases**: 80%+
- **Overall backend**: 85%+
