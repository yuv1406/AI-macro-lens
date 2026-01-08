# AI MacroLens Backend

AI-powered macro analysis backend for a mobile-first diet tracking app using Supabase Edge Functions.

## Features

✨ **AI-Powered Analysis**
- Gemini Vision (primary) with OpenAI GPT-4o-mini fallback
- Specialized for Indian home-cooked meals
- Conservative estimates for oil/butter
- Confidence scoring (low/medium/high)

🔒 **Security & Cost Control**
- JWT authentication required
- Rate limiting: 5 AI calls per user per day
- Cost guard: ₹80 monthly budget
- No API keys exposed to clients

📊 **Macro Estimates**
- Calories
- Protein (grams)
- Carbs (grams)
- Fat (grams)
- Confidence level
- Auto-saved to database

## Project Structure

```
ai-macrolens/
├── supabase/
│   └── functions/
│       ├── analyze-meal/          # Main Edge Function
│       │   ├── index.ts           # Entry point & orchestration
│       │   ├── types.ts           # TypeScript definitions
│       │   ├── config.ts          # Configuration constants
│       │   ├── validators.ts      # Input validation
│       │   ├── gemini-helper.ts   # Gemini Vision API
│       │   ├── openai-helper.ts   # OpenAI API
│       │   └── database.ts        # Supabase DB operations
│       └── import_map.json        # Deno dependencies
├── DEPLOYMENT.md                   # Deployment instructions
├── EXAMPLES.md                     # Example curl requests
└── README.md                       # This file
```

## Quick Start

### Prerequisites

- [Supabase account](https://supabase.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Gemini API key](https://makersuite.google.com/app/apikey)
- [OpenAI API key](https://platform.openai.com/api-keys)

### Setup

1. **Clone and navigate to project:**
   ```bash
   cd c:/Users/yuvia/OneDrive/Desktop/ai-macrolens
   ```

2. **Link to your Supabase project:**
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

3. **Set API keys as secrets:**
   ```bash
   supabase secrets set GEMINI_API_KEY=<your-gemini-key>
   supabase secrets set OPENAI_API_KEY=<your-openai-key>
   ```

4. **Deploy the function:**
   ```bash
   supabase functions deploy analyze-meal
   ```

5. **Test it:**
   ```bash
   curl -i --location --request POST \
     'https://<project-ref>.supabase.co/functions/v1/analyze-meal' \
     --header 'Authorization: Bearer <jwt-token>' \
     --header 'apikey: <anon-key>' \
     --header 'Content-Type: application/json' \
     --data '{
       "user_id": "<user-id>",
       "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
       "description": "Dal and rice"
     }'
   ```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## API Reference

### Endpoint

```
POST https://<project-ref>.supabase.co/functions/v1/analyze-meal
```

### Request Headers

```
Authorization: Bearer <jwt-token>
apikey: <supabase-anon-key>
Content-Type: application/json
```

### Request Body

```json
{
  "user_id": "uuid",
  "image_url": "string",
  "description": "string (optional)"
}
```

### Success Response (200)

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

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `validation error` | Invalid request format |
| 401 | `Missing authorization header` | No JWT provided |
| 403 | `user_id does not match` | User ID mismatch |
| 429 | `Daily rate limit exceeded` | 5 calls per day limit hit |
| 429 | `Monthly cost limit reached` | ₹80 monthly budget hit |
| 500 | `unable_to_estimate` | AI analysis failed |

## Database Schema

The backend expects these tables in Supabase:

### `meals` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| image_url | text | Meal image URL |
| description | text | Optional description |
| calories | integer | Estimated calories |
| protein | numeric | Protein in grams |
| carbs | numeric | Carbs in grams |
| fat | numeric | Fat in grams |
| confidence | text | 'low', 'medium', or 'high' |
| source | text | 'ai' or 'manual' |
| created_at | timestamptz | Auto-set timestamp |

### `ai_usage` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| usage_date | date | Date of usage |
| calls | integer | Number of AI calls |
| estimated_cost | numeric | Cost in INR |

## Configuration

Edit [config.ts](./supabase/functions/analyze-meal/config.ts):

```typescript
export const CONFIG = {
  RATE_LIMIT_DAILY: 5,              // Max AI calls per user per day
  COST_LIMIT_MONTHLY_INR: 80,       // Monthly budget in ₹
  GEMINI_COST_PER_IMAGE_INR: 0.03,  // Cost per Gemini call
  OPENAI_COST_PER_IMAGE_INR: 0.09,  // Cost per OpenAI call
  LOW_CONFIDENCE_THRESHOLD: 0.6,    // Confidence threshold
};
```

## How It Works

1. **Authentication:** Validates JWT token from Supabase Auth
2. **Rate Limiting:** Checks daily usage count in `ai_usage` table
3. **Cost Guard:** Checks monthly total cost
4. **Image Validation:** Verifies image URL is accessible
5. **AI Analysis:**
   - Attempts Gemini Vision first (cheaper)
   - Falls back to OpenAI if Gemini fails or returns low confidence
   - Uses specialized prompt for Indian food
6. **Database Save:** Stores meal + macros in `meals` table
7. **Usage Tracking:** Increments `ai_usage` counter
8. **Response:** Returns JSON with macros + confidence

## AI Prompt Strategy

Both models use the same prompt optimized for:
- **Indian cuisine:** Recognizes dal, rice, roti, curry, etc.
- **Conservative estimates:** Underestimates oil/ghee for health
- **Portion awareness:** Realistic serving sizes
- **Confidence scoring:** Returns low confidence when unsure
- **JSON only:** Strict JSON output, no explanations

## Cost Estimates

Based on current API pricing:

| Model | Cost per Image | Images per ₹80 |
|-------|----------------|----------------|
| Gemini 1.5 Flash | ₹0.03 | ~2,600 |
| OpenAI GPT-4o-mini | ₹0.09 | ~880 |

With 5 calls/day limit:
- Max 150 calls/month per user
- Estimated cost: ₹4.50-13.50 per user/month

## Development

### Local Testing

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve analyze-meal --env-file .env

# Test locally
curl http://localhost:54321/functions/v1/analyze-meal \
  --header 'Authorization: Bearer <local-jwt>' \
  --data '{"user_id":"...","image_url":"..."}'
```

### View Logs

```bash
# Live logs
supabase functions logs analyze-meal --tail

# Or in dashboard
https://supabase.com/dashboard/project/<ref>/functions
```

## Troubleshooting

See [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting) for common issues.

## Security

✅ API keys stored as Supabase secrets (never in code)
✅ JWT authentication required
✅ User ID validation (users can only analyze their meals)
✅ Row Level Security (RLS) on database tables
✅ Rate limiting per user
✅ Cost budget enforcement

## License

MIT

## Support

For issues or questions:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Review [EXAMPLES.md](./EXAMPLES.md)
3. Check function logs: `supabase functions logs analyze-meal`
