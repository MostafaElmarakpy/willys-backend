# Menu Management API Documentation

This document provides comprehensive information about the Menu Management APIs in Willy's Restaurant Backend system.

## Overview

The menu management system consists of four main components:
- **Categories**: Menu item categories (Appetizers, Main Dishes, etc.)
- **Items**: Individual menu items with pricing and descriptions
- **Variants**: Size, spice level, extras options
- **Ingredients**: Stock management and ingredient tracking

All endpoints require admin authentication using JWT tokens.

## Base URL

```
http://localhost:8080/api/v1
```

## Authentication

All menu management endpoints require:
- **Authentication**: Bearer token in Authorization header
- **Authorization**: Admin role only
- **API Version**: v1

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Categories Management

### Get All Categories

```http
GET /admin/menu/categories
```

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `search` (optional): Search term for category names

**Response:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": {
          "en": "Main Dishes",
          "ar": "الأطباق الرئيسية"
        },
        "description": {
          "en": "Our signature main courses",
          "ar": "أطباقنا الرئيسية المميزة"
        },
        "image": "https://example.com/main-dishes.jpg",
        "isActive": true,
        "sortOrder": 1,
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Create Category

```http
POST /admin/menu/categories
```

**Request Body:**
```json
{
  "name": {
    "en": "Main Dishes",
    "ar": "الأطباق الرئيسية"
  },
  "description": {
    "en": "Our signature main courses",
    "ar": "أطباقنا الرئيسية المميزة"
  },
  "image": "https://example.com/main-dishes.jpg",
  "isActive": true,
  "sortOrder": 1
}
```

### Get Active Categories

```http
GET /admin/menu/categories/active
```

Returns only active categories without pagination.

### Get Category by ID

```http
GET /admin/menu/categories/:id
```

### Update Category

```http
PATCH /admin/menu/categories/:id
```

### Delete Category

```http
DELETE /admin/menu/categories/:id
```

## Items Management

### Get All Items

```http
GET /admin/menu/items
```

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `search` (optional): Search term for item names
- `categoryId` (optional): Filter by category ID
- `status` (optional): Filter by status (active, draft, archived)

### Create Item

```http
POST /admin/menu/items
```

**Request Body:**
```json
{
  "name": {
    "en": "Grilled Chicken Caesar Salad",
    "ar": "سلطة قيصر بالدجاج المشوي"
  },
  "description": {
    "en": "Fresh romaine lettuce with grilled chicken, parmesan cheese, and caesar dressing",
    "ar": "خس روماني طازج مع دجاج مشوي وجبن بارميزان وصوص قيصر"
  },
  "image": "https://example.com/caesar-salad.jpg",
  "price": 45.00,
  "status": "active",
  "sortOrder": 1,
  "categoryId": "category-uuid",
  "variantIds": ["variant-uuid-1", "variant-uuid-2"],
  "ingredientIds": ["ingredient-uuid-1", "ingredient-uuid-2"]
}
```

**Item Status Options:**
- `active`: Available for ordering
- `draft`: Not yet published
- `archived`: No longer available

### Get Item by ID

```http
GET /admin/menu/items/:id
```

### Update Item

```http
PATCH /admin/menu/items/:id
```

### Delete Item

```http
DELETE /admin/menu/items/:id
```

### Get Items by Category

```http
GET /admin/menu/items/category/:categoryId
```

## Variants Management

### Get All Variants

```http
GET /admin/menu/variants
```

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `search` (optional): Search term for variant names

### Create Variant

```http
POST /admin/menu/variants
```

**Request Body:**
```json
{
  "name": {
    "en": "Size",
    "ar": "الحجم"
  },
  "type": "default",
  "isActive": true,
  "sortOrder": 1
}
```

**Variant Types:**
- `default`: Standard variant (Size, Spice Level)
- `extra`: Additional items (Extra Cheese, Extra Meat)

### Get Active Variants

```http
GET /admin/menu/variants/active
```

### Get Variant by ID

```http
GET /admin/menu/variants/:id
```

### Update Variant

```http
PATCH /admin/menu/variants/:id
```

### Delete Variant

```http
DELETE /admin/menu/variants/:id
```

## Variant Values Management

### Create Variant Value

```http
POST /admin/menu/variants/values
```

**Request Body:**
```json
{
  "name": {
    "en": "Large",
    "ar": "كبير"
  },
  "price": 20.00,
  "isActive": true,
  "sortOrder": 2,
  "variantId": "variant-uuid"
}
```

### Get Variant Values

```http
GET /admin/menu/variants/:variantId/values
```

### Get Variant Value by ID

```http
GET /admin/menu/variants/values/:id
```

### Update Variant Value

```http
PATCH /admin/menu/variants/values/:id
```

### Delete Variant Value

```http
DELETE /admin/menu/variants/values/:id
```

## Ingredients Management

### Get All Ingredient Categories

```http
GET /admin/menu/ingredients/categories
```

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `search` (optional): Search term for category names

### Create Ingredient Category

```http
POST /admin/menu/ingredients/categories
```

**Request Body:**
```json
{
  "name": {
    "en": "Vegetables",
    "ar": "الخضروات"
  },
  "description": {
    "en": "Fresh vegetables and greens",
    "ar": "خضروات ورقيات طازجة"
  },
  "isActive": true,
  "sortOrder": 1
}
```

### Get Active Ingredient Categories

```http
GET /admin/menu/ingredients/categories/active
```

### Get Ingredient Category by ID

```http
GET /admin/menu/ingredients/categories/:id
```

### Update Ingredient Category

```http
PATCH /admin/menu/ingredients/categories/:id
```

### Delete Ingredient Category

```http
DELETE /admin/menu/ingredients/categories/:id
```

### Get All Ingredients

```http
GET /admin/menu/ingredients
```

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `search` (optional): Search term for ingredient names
- `categoryId` (optional): Filter by ingredient category ID

### Create Ingredient

```http
POST /admin/menu/ingredients
```

**Request Body:**
```json
{
  "name": {
    "en": "Tomatoes",
    "ar": "طماطم"
  },
  "quantity": 100.50,
  "isOptional": false,
  "stockPercentage": 85.0,
  "isActive": true,
  "categoryId": "ingredient-category-uuid"
}
```

**Field Descriptions:**
- `quantity`: Available quantity in stock
- `isOptional`: Whether ingredient is optional for items
- `stockPercentage`: Current stock level percentage (0-100)

### Get Ingredient by ID

```http
GET /admin/menu/ingredients/:id
```

### Update Ingredient

```http
PATCH /admin/menu/ingredients/:id
```

### Delete Ingredient

```http
DELETE /admin/menu/ingredients/:id
```

### Get Ingredients by Category

```http
GET /admin/menu/ingredients/categories/:categoryId/ingredients
```

## Data Models

### BilingualString Structure

```json
{
  "en": "English text",
  "ar": "النص العربي"
}
```

### Common Response Format

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

## Status Codes

- `200 OK`: Successful GET/PATCH/DELETE requests
- `201 Created`: Successful POST requests
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Usage Examples

### Creating a Complete Menu Item

1. **Create Category:**
```http
POST /admin/menu/categories
{
  "name": {"en": "Main Dishes", "ar": "الأطباق الرئيسية"},
  "isActive": true,
  "sortOrder": 1
}
```

2. **Create Size Variant:**
```http
POST /admin/menu/variants
{
  "name": {"en": "Size", "ar": "الحجم"},
  "type": "default",
  "isActive": true
}
```

3. **Create Variant Values:**
```http
POST /admin/menu/variants/values
{
  "name": {"en": "Large", "ar": "كبير"},
  "price": 20.00,
  "variantId": "size-variant-uuid"
}
```

4. **Create Ingredient:**
```http
POST /admin/menu/ingredients
{
  "name": {"en": "Chicken Breast", "ar": "صدر دجاج"},
  "quantity": 200,
  "stockPercentage": 95,
  "categoryId": "protein-category-uuid"
}
```

5. **Create Menu Item:**
```http
POST /admin/menu/items
{
  "name": {"en": "Grilled Chicken", "ar": "دجاج مشوي"},
  "price": 45.00,
  "categoryId": "main-dishes-uuid",
  "variantIds": ["size-variant-uuid"],
  "ingredientIds": ["chicken-ingredient-uuid"]
}
```

## Best Practices

1. **Always provide bilingual content** for name and description fields
2. **Use meaningful sort orders** for proper display ordering
3. **Set appropriate stock percentages** for inventory management
4. **Use draft status** for items under development
5. **Test with Postman collection** provided in `docs/postman/`

## Related Documentation

- [Authentication API](./authentication.md)
- [Branches & Zones API](./branches-zones.md)
- [System Architecture](../architecture/system-overview.md)