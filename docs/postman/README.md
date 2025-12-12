# Willy's Backend - Postman API Documentation

This directory contains Postman collections and environments for testing the Willy's Backend API, including the complete Bundles management system.

## Files

- `bundles-api.postman_collection.json` - Complete Bundles API collection
- `willys-backend-environment.postman_environment.json` - Environment variables

## Quick Setup

### 1. Import Collections and Environment

1. Open Postman
2. Click **Import** button
3. Import both files:
   - `bundles-api.postman_collection.json`
   - `willys-backend-environment.postman_environment.json`

### 2. Set Environment Variables

1. Select "Willy's Backend Environment" from the environment dropdown
2. Update the following variables if needed:
   - `base_url`: Your backend URL (default: `http://localhost:3000`)
   - `admin_email`: Admin user email
   - `admin_password`: Admin user password

### 3. Authentication Setup

Before testing bundle endpoints, you need to authenticate:

1. **Login Request**: Create a login request to `/api/v1/auth/login`
   ```json
   {
     "email": "{{admin_email}}",
     "password": "{{admin_password}}"
   }
   ```

2. **Extract Token**: Add this test script to automatically extract the token:
   ```javascript
   if (pm.response.code === 200) {
     const responseJson = pm.response.json();
     pm.environment.set("access_token", responseJson.data.accessToken);
     pm.environment.set("refresh_token", responseJson.data.refreshToken);
   }
   ```

## Bundles API Endpoints

### Overview

The Bundles API provides complete CRUD operations for managing menu bundles with the following features:

- ✅ **Bilingual Support** - Arabic and English names/descriptions
- ✅ **Item Management** - Associate multiple menu items with bundles
- ✅ **Category Association** - Link bundles to menu categories  
- ✅ **Status Management** - Active, Draft, Archived states
- ✅ **Advanced Filtering** - Search, price range, category filters
- ✅ **Pagination** - Efficient data retrieval
- ✅ **Audit Trail** - Created/updated by tracking

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/admin/menu/bundles` | List all bundles with filtering |
| `POST` | `/api/v1/admin/menu/bundles` | Create new bundle |
| `GET` | `/api/v1/admin/menu/bundles/{id}` | Get bundle by ID |
| `PATCH` | `/api/v1/admin/menu/bundles/{id}` | Update bundle |
| `DELETE` | `/api/v1/admin/menu/bundles/{id}` | Delete bundle |
| `GET` | `/api/v1/admin/menu/bundles/category/{categoryId}` | Get bundles by category |
| `POST` | `/api/v1/admin/menu/bundles/{id}/duplicate` | Duplicate bundle |
| `PATCH` | `/api/v1/admin/menu/bundles/{id}/archive` | Archive bundle |

## Testing Workflow

### 1. Basic CRUD Operations

1. **Create Category** (if needed)
2. **Create Items** (if needed)
3. **Create Bundle**
4. **Get All Bundles** - Test filtering
5. **Get Bundle by ID** - Test details
6. **Update Bundle** - Test modifications
7. **Archive Bundle** - Test status change
8. **Delete Bundle** - Cleanup

### 2. Advanced Features

1. **Filtering Tests**:
   - Search by name
   - Filter by status
   - Filter by category
   - Price range filtering
   - Sorting options

2. **Bundle Management**:
   - Add/remove items from bundle
   - Duplicate existing bundle
   - Archive/restore bundles

### 3. Error Scenarios

Test these error cases:
- Invalid bundle ID (404)
- Missing required fields (400)
- Invalid price values (400)
- Non-existent category ID (400)
- Unauthorized access (401/403)

## Request Examples

### Create Bundle

```json
{
  "name": {
    "ar": "باقة البرجر الكلاسيكي",
    "en": "Classic Burger Bundle"
  },
  "description": {
    "ar": "باقة تحتوي على برجر وبطاطس ومشروب",
    "en": "Bundle includes burger, fries, and drink"
  },
  "image": "https://example.com/bundle-image.jpg",
  "categoryId": "{{category_id}}",
  "price": 25.50,
  "status": "draft",
  "itemIds": [
    "item-uuid-1",
    "item-uuid-2",
    "item-uuid-3"
  ]
}
```

### Filter Bundles

Query parameters for GET `/api/v1/admin/menu/bundles`:

```
?page=1
&limit=10
&search=burger
&status=active
&categoryId=cat-uuid
&minPrice=10
&maxPrice=50
&sortBy=price
&sortOrder=ASC
```

## Response Format

All endpoints follow this consistent response format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information"
  }
}
```

## Bundle Status Values

- `active` - Bundle is available for customers
- `draft` - Bundle is being prepared (default for new bundles)
- `archived` - Bundle is no longer available but kept for records

## Collection Features

### Automatic Variables

The collection automatically extracts and sets these variables:
- `bundle_id` - From create/get responses
- `category_id` - From bundle responses
- `timestamp` - Current timestamp for requests

### Built-in Tests

Each request includes automatic tests for:
- ✅ Response time validation
- ✅ Response structure validation
- ✅ Success field verification
- ✅ Message field verification
- ✅ Auto-extraction of IDs for request chaining

### Error Handling

The collection handles common scenarios:
- Token expiration
- Invalid requests
- Server errors
- Network timeouts

## Tips for Testing

1. **Start with Authentication** - Always login first
2. **Use Variables** - Leverage collection variables for dynamic testing
3. **Test Edge Cases** - Include invalid data scenarios
4. **Verify Relationships** - Test bundle-item and bundle-category associations
5. **Check Pagination** - Test with large datasets
6. **Validate Bilingual Data** - Ensure Arabic/English content is handled correctly

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if `access_token` is set
   - Verify token hasn't expired
   - Ensure user has admin role

2. **404 Not Found**
   - Verify the bundle/category/item ID exists
   - Check the endpoint URL

3. **400 Bad Request**
   - Validate request body structure
   - Check required fields
   - Verify data types (especially price as number)

### Debug Tips

1. Enable Postman Console to see request/response details
2. Check environment variables are properly set
3. Verify the backend server is running
4. Review backend logs for detailed error messages

## Contributing

When adding new endpoints or modifying existing ones:

1. Update the Postman collection
2. Add comprehensive request examples
3. Include error scenario tests
4. Update this documentation
5. Test all endpoints thoroughly

## Support

For questions or issues with the API documentation:
1. Check backend server logs
2. Verify database migrations have run
3. Ensure all dependencies are installed
4. Contact the development team