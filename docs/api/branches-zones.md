# 🏪 Branches & Zones API Reference

## Base URL
`/api/v1/`

## Authentication & Authorization
- **Authentication**: All endpoints require JWT Bearer token in Authorization header
- **Authorization**: All endpoints require ADMIN role (`UserRole.admin`)
- **API Versioning**: All endpoints use version 1 (`/api/v1/`)

## Branches Endpoints

### Create Branch
`POST /branches`

**Request Body:**
```json
{
  "name": {
    "en": "Alexandria - Smouha Branch",
    "ar": "الإسكندرية - فرع سموحة"
  },
  "address": "Smouha Square, Alexandria, Egypt",
  "latitude": 31.2102,
  "longitude": 29.9450,
  "phone": "+201234567890",
  "email": "smouha@willys.com",
  "deliveryFee": 15.50,
  "estimatedDeliveryTime": 30,
  "openingHours": "09:00",
  "closingHours": "23:00"
}
```

### Get All Branches
`GET /branches?status=active|open|all`

### Get Branch by ID
`GET /branches/:id`

### Update Branch
`PUT /branches/:id`

### Delete Branch
`DELETE /branches/:id`

### Check Delivery Zone
`POST /branches/check-delivery-zone`
```json
{
  "latitude": 31.2150,
  "longitude": 29.9500
}
```

### Find Nearby Branches
`GET /branches/nearby?latitude=31.2102&longitude=29.9450&radius=5`

## Zones Endpoints

### Create Zone
`POST /zones`

**Request Body:**
```json
{
  "name": {
    "en": "Smouha Delivery Zone",
    "ar": "منطقة توصيل سموحة"
  },
  "branchId": "branch-uuid-here",
  "polygon": {
    "type": "Polygon",
    "coordinates": [[
      [29.9400, 31.2050],
      [29.9500, 31.2050], 
      [29.9500, 31.2150],
      [29.9400, 31.2150],
      [29.9400, 31.2050]
    ]]
  },
  "priority": 10
}
```

### Get All Zones
`GET /zones`

### Get Zones by Branch
`GET /zones/branch/:branchId`

### Update Zone
`PUT /zones/:id`

### Delete Zone
`DELETE /zones/:id`

### Check Point in Zone
`POST /zones/check-point`
```json
{
  "latitude": 31.2100,
  "longitude": 29.9450
}
```

## Response Format

All responses follow this structure:
```json
{
  "statusCode": 200,
  "message": "Operation successful",
  "data": { /* actual data */ }
}
```

## Error Responses

### Validation Error (400)
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "field": ["error messages"]
  }
}
```

### Unauthorized (401)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Forbidden - Insufficient Role (403)
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

## Required Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Note**: User must have ADMIN role to access any of these endpoints.