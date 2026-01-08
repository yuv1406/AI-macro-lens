# AI Macro Analysis API Documentation

**Version:** 1.0  
**Base URL:** `https://djtqlcljpmmuvvbptvhc.supabase.co/functions/v1`

---

## Overview

The AI Macro Analysis API analyzes meal images and returns macronutrient estimates using Google's Gemini Vision AI. Designed specifically for Indian home-cooked meals.

**Key Features:**
- 🤖 AI-powered macro estimation (calories, protein, carbs, fat)
- 🍽️ Automatic meal description for verification
- 📊 Confidence scoring (low/medium/high)
- 🔒 JWT authentication required
- ⚡ Rate limited: 5 calls per user per day

---

## Authentication

All requests require **JWT authentication** from Supabase Auth.

```javascript
// Get authenticated user
const { data: { user } } = await supabase.auth.getUser();

// JWT is automatically included in Supabase client requests
```

---

## Endpoint

### POST `/analyze-meal`

Analyzes a meal image and returns macronutrient estimates.

**URL:** `https://djtqlcljpmmuvvbptvhc.supabase.co/functions/v1/analyze-meal`

---

## Request

### Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer <JWT_TOKEN>` | ✅ Yes |
| `apikey` | Your Supabase anon key | ✅ Yes |
| `Content-Type` | `application/json` | ✅ Yes |

### Body Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | string (UUID) | ✅ Yes | Authenticated user's ID |
| `image_url` | string (URL) | ✅ Yes | Public URL of the meal image |
| `description` | string | ❌ No | Optional user notes about the meal |

### Example Request Body

```json
{
  "user_id": "86509639-c1a5-412a-a392-a395f715092d",
  "image_url": "https://your-storage.com/meal-image.jpg",
  "description": "Lunch"
}
```

---

## Response

### Success Response (200 OK)

```json
{
  "calories": 630,
  "protein": 15.0,
  "carbs": 114.0,
  "fat": 14.0,
  "confidence": "high",
  "meal_description": "Plain white rice with Kadhi, a side salad of cucumber and beetroot, and one small sweet (Ladoo).",
  "source": "ai",
  "ai_model_used": "gemini"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `calories` | number | Estimated calories (kcal) |
| `protein` | number | Protein in grams (1 decimal place) |
| `carbs` | number | Carbohydrates in grams (1 decimal place) |
| `fat` | number | Fat in grams (1 decimal place) |
| `confidence` | string | AI confidence: `"low"`, `"medium"`, or `"high"` |
| `meal_description` | string | AI-generated description of food items |
| `source` | string | Always `"ai"` |
| `ai_model_used` | string | `"gemini"` or `"openai"` |

---

## Error Responses

### 400 Bad Request

**Missing Required Fields:**
```json
{
  "error": "Missing required fields",
  "details": "user_id and image_url are required"
}
```

**Invalid Image URL:**
```json
{
  "error": "Image URL returned status 404"
}
```

**Not Food:**
```json
{
  "error": "unable_to_estimate",
  "details": "Image does not appear to contain food"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "details": "Missing authorization header"
}
```

### 429 Too Many Requests

```json
{
  "error": "rate_limit_exceeded",
  "details": "Daily limit of 5 analyses reached. Limit resets at midnight."
}
```

### 500 Internal Server Error

```json
{
  "error": "unable_to_estimate",
  "details": "AI analysis failed. Please check the image and try again."
}
```

---

## Code Examples

### React Native (with Supabase)

```typescript
import { supabase } from './supabaseClient';

interface MealAnalysisRequest {
  user_id: string;
  image_url: string;
  description?: string;
}

interface MealAnalysisResponse {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'low' | 'medium' | 'high';
  meal_description?: string;
  source: 'ai';
  ai_model_used?: 'gemini' | 'openai';
}

async function analyzeMeal(
  imageUrl: string, 
  description?: string
): Promise<MealAnalysisResponse> {
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke<MealAnalysisResponse>(
    'analyze-meal',
    {
      body: {
        user_id: user.id,
        image_url: imageUrl,
        description: description
      }
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Usage Example
async function handleMealPhoto(photoUri: string) {
  try {
    // 1. Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meal-images')
      .upload(`${user.id}/${Date.now()}.jpg`, {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'meal.jpg'
      });

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('meal-images')
      .getPublicUrl(uploadData.path);

    // 3. Analyze meal
    const analysis = await analyzeMeal(publicUrl, 'Dinner');

    // 4. Display results
    console.log('Meal:', analysis.meal_description);
    console.log('Calories:', analysis.calories);
    console.log('Protein:', analysis.protein, 'g');
    console.log('Carbs:', analysis.carbs, 'g');
    console.log('Fat:', analysis.fat, 'g');
    console.log('Confidence:', analysis.confidence);

    return analysis;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}
```

### JavaScript (Web)

```javascript
async function analyzeMeal(imageUrl) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    'https://djtqlcljpmmuvvbptvhc.supabase.co/functions/v1/analyze-meal',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': 'YOUR_SUPABASE_ANON_KEY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: session.user.id,
        image_url: imageUrl,
        description: 'Lunch'
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error);
  }

  return await response.json();
}
```

---

## Rate Limiting

**Limits:**
- **5 analyses per user per day**
- **Monthly budget cap:** ₹80
- **Resets:** Daily at 00:00 UTC

**Rate Limit Response:**
```json
{
  "error": "rate_limit_exceeded",
  "details": "Daily limit of 5 analyses reached. Limit resets at midnight."
}
```

**Checking Usage:**
```sql
-- Query user's daily usage
SELECT calls, usage_date 
FROM ai_usage 
WHERE user_id = 'your-user-id' 
  AND usage_date = CURRENT_DATE;
```

---

## Image Requirements

**Supported Formats:**
- JPEG, PNG, WebP
- Max size: 10MB (recommended < 5MB)

**Image URL Requirements:**
- Must be **publicly accessible** (no auth required)
- HTTPS recommended
- URL must return `Content-Type: image/*`

**Best Practices:**
- ✅ Clear, well-lit photos
- ✅ Food visible and recognizable
- ✅ Standard portion sizes
- ❌ Avoid blurry or dark images
- ❌ Don't include non-food items

---

## Confidence Scores

| Score | Description | Recommendation |
|-------|-------------|----------------|
| `high` | Clear image, recognizable food, standard portions | Use values as-is |
| `medium` | Partially visible or uncertain portions | Ask user to confirm |
| `low` | Unclear image or unrecognizable food | Suggest manual entry |

---

## Database Schema

Analyzed meals are automatically saved to the `meals` table:

```sql
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  calories INTEGER NOT NULL,
  protein DECIMAL(5,1) NOT NULL,
  carbs DECIMAL(5,1) NOT NULL,
  fat DECIMAL(5,1) NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  source TEXT NOT NULL DEFAULT 'ai',
  ai_model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Testing

**Test with cURL:**

```bash
curl -X POST https://djtqlcljpmmuvvbptvhc.supabase.co/functions/v1/analyze-meal \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "image_url": "https://example.com/food.jpg",
    "description": "Test meal"
  }'
```

**Test Script:**
See `test-uploaded-image.ps1` for a complete PowerShell test example.

---

## Support & Troubleshooting

### Common Issues

**1. "Auth session missing"**
- Ensure JWT token is valid and not expired
- Check Authorization header format: `Bearer <token>`

**2. "Image URL returned status 404"**
- Verify image URL is publicly accessible
- Test URL in browser first

**3. "Rate limit exceeded"**
- User has reached 5 calls/day limit
- Wait until next day or upgrade limits

**4. Low confidence scores**
- Improve image quality (lighting, focus)
- Ensure food is clearly visible
- Try different angle

### Contact

For issues or questions:
- Project: https://github.com/your-repo
- Email: support@example.com

---

## Changelog

### v1.0 (2025-12-19)
- ✅ Initial release
- ✅ Gemini 2.5 Flash integration
- ✅ JWT authentication
- ✅ Rate limiting (5/day)
- ✅ Meal description feature
- ✅ Confidence scoring

---

**Built with:**
- Supabase Edge Functions
- Google Gemini 2.5 Flash Vision AI
- Deno Runtime
