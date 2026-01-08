# Example Requests - Analyze Meal Function

Example curl commands for testing the `analyze-meal` Edge Function.

## Prerequisites

Replace the following placeholders:
- `<PROJECT_REF>` - Your Supabase project reference ID
- `<ANON_KEY>` - Your Supabase anon (public) key
- `<JWT_TOKEN>` - User's JWT token from authentication
- `<USER_ID>` - Authenticated user's UUID

## Getting a JWT Token

First, authenticate a user to get their JWT:

```bash
curl --location --request POST 'https://<PROJECT_REF>.supabase.co/auth/v1/token?grant_type=password' \
  --header 'apikey: <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Extract the `access_token` from the response and use it as `<JWT_TOKEN>` below.

---

## 1. Successful Meal Analysis

```bash
curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/analyze-meal' \
  --header 'Authorization: Bearer <JWT_TOKEN>' \
  --header 'apikey: <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "<USER_ID>",
    "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    "description": "Plate of dal, rice, and vegetables"
  }'
```

**Expected Response (200):**
```json
{
  "calories": 450,
  "protein": 18.5,
  "carbs": 65.2,
  "fat": 12.3,
  "confidence": "high",
  "source": "ai",
  "ai_model_used": "gemini"
}
```

---

## 2. Analysis with Only Image URL

```bash
curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/analyze-meal' \
  --header 'Authorization: Bearer <JWT_TOKEN>' \
  --header 'apikey: <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "<USER_ID>",
    "image_url": "https://images.unsplash.com/photo-1585937421612-70a008356fbe"
  }'
```

**Expected Response (200):**
```json
{
  "calories": 320,
  "protein": 12.0,
  "carbs": 45.0,
  "fat": 8.5,
  "confidence": "medium",
  "source": "ai",
  "ai_model_used": "gemini"
}
```

---

## 3. Missing Authorization (401 Error)

```bash
curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/analyze-meal' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "<USER_ID>",
    "image_url": "https://example.com/food.jpg"
  }'
```

**Expected Response (401):**
```json
{
  "error": "Missing authorization header"
}
```

---

## 4. Invalid Request - Missing image_url

```bash
curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/analyze-meal' \
  --header 'Authorization: Bearer <JWT_TOKEN>' \
  --header 'apikey: <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "<USER_ID>"
  }'
```

**Expected Response (400):**
```json
{
  "error": "image_url is required and must be a string"
}
```

---

## 5. Invalid Image URL

```bash
curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/analyze-meal' \
  --header 'Authorization: Bearer <JWT_TOKEN>' \
  --header 'apikey: <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "<USER_ID>",
    "image_url": "not-a-valid-url"
  }'
```

**Expected Response (400):**
```json
{
  "error": "image_url must be a valid HTTP/HTTPS URL"
}
```

---

## 6. User ID Mismatch (403 Error)

```bash
curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/analyze-meal' \
  --header 'Authorization: Bearer <JWT_TOKEN>' \
  --header 'apikey: <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "00000000-0000-0000-0000-000000000000",
    "image_url": "https://example.com/food.jpg"
  }'
```

**Expected Response (403):**
```json
{
  "error": "user_id does not match authenticated user"
}
```

---

## 7. Rate Limit Exceeded (429 Error)

Make 6 requests in the same day:

```bash
# First 5 requests succeed, 6th fails
for i in {1..6}; do
  curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/analyze-meal' \
    --header 'Authorization: Bearer <JWT_TOKEN>' \
    --header 'apikey: <ANON_KEY>' \
    --header 'Content-Type: application/json' \
    --data '{
      "user_id": "<USER_ID>",
      "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
    }'
  echo "\n--- Request $i ---\n"
  sleep 2
done
```

**Expected Response on 6th Request (429):**
```json
{
  "error": "Daily rate limit exceeded. Max 5 AI analyses per day."
}
```

---

## 8. Non-Food Image

```bash
curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/analyze-meal' \
  --header 'Authorization: Bearer <JWT_TOKEN>' \
  --header 'apikey: <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "<USER_ID>",
    "image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
    "description": "Mountain landscape"
  }'
```

**Expected Response (400 or 500):**
```json
{
  "error": "unable_to_estimate",
  "details": "Image does not appear to contain food"
}
```

---

## Testing Rate Limiting

Check current usage:

```sql
SELECT * FROM ai_usage 
WHERE user_id = '<USER_ID>' 
  AND usage_date = CURRENT_DATE;
```

Reset usage for testing (run in Supabase SQL Editor):

```sql
DELETE FROM ai_usage 
WHERE user_id = '<USER_ID>' 
  AND usage_date = CURRENT_DATE;
```

---

## Testing Cost Guard

Simulate monthly cost limit (run in SQL Editor):

```sql
-- Add fake usage to hit cost limit
INSERT INTO ai_usage (user_id, usage_date, calls, estimated_cost)
VALUES 
  ('<USER_ID>', CURRENT_DATE - INTERVAL '1 day', 100, 30),
  ('<USER_ID>', CURRENT_DATE - INTERVAL '2 days', 100, 30),
  ('<USER_ID>', CURRENT_DATE - INTERVAL '3 days', 100, 25);
```

Then make a request - should fail with:

**Expected Response (429):**
```json
{
  "error": "Monthly cost limit reached (₹80). Please try again next month."
}
```

---

## Sample Image URLs for Testing

Indian food images from Unsplash:

1. **Dal and Rice:** `https://images.unsplash.com/photo-1546069901-ba9599a7e63c`
2. **Curry Plate:** `https://images.unsplash.com/photo-1585937421612-70a008356fbe`
3. **Biryani:** `https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8`
4. **Thali:** `https://images.unsplash.com/photo-1626132647523-66f0bf380027`
5. **Dosa:** `https://images.unsplash.com/photo-1630505898374-b0ae8e83c76e`

---

## Quick Test Script

Save as `test-analyze-meal.sh`:

```bash
#!/bin/bash

PROJECT_REF="your-project-ref"
ANON_KEY="your-anon-key"
JWT_TOKEN="your-jwt-token"
USER_ID="your-user-id"

FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/analyze-meal"

echo "Testing analyze-meal function..."
echo ""

curl -i --location --request POST "$FUNCTION_URL" \
  --header "Authorization: Bearer $JWT_TOKEN" \
  --header "apikey: $ANON_KEY" \
  --header "Content-Type: application/json" \
  --data "{
    \"user_id\": \"$USER_ID\",
    \"image_url\": \"https://images.unsplash.com/photo-1546069901-ba9599a7e63c\",
    \"description\": \"Dal, rice, and vegetables\"
  }"
```

Run with: `bash test-analyze-meal.sh`
