# AI MacroLens Backend

A calm, slightly opinionated AI that looks at your food and gives you macros.

This is the backend for a mobile-first diet tracking app.
You send it a meal photo. It sends back calories and macros.
No weighing. No spreadsheets. No suffering.

Built on Supabase Edge Functions and tuned for Indian home-cooked food, where oil is "thoda sa" and measurements are vibes.

## What it does (in simple words)

- Looks at your food image
- Understands Indian meals (dal, rice, roti, sabzi, curry)
- Estimates calories, protein, carbs, and fat
- Plays it safe with oil and ghee
- Tells you how confident it is
- Saves everything automatically

That's it. No drama.

## The AI part

- Gemini Vision is used first (fast and affordable)
- OpenAI GPT-4o-mini steps in if Gemini is unsure
- Both models use the same carefully written prompt
- Output is always clean JSON
- No explanations, no essays

**Confidence levels:**
- `high` – clear image, common food
- `medium` – decent guess
- `low` – blurry image or something unusual

## Safety, limits, and money stuff

This backend is polite and responsible.

- JWT authentication is required
- Users can only analyze their own meals
- 7 AI calls per user per day
- ₹100 monthly budget cap
- API keys never leave the server
- Row Level Security enabled

No surprise bills. No abuse.

## What you get back

Every successful request returns:

- Calories
- Protein (grams)
- Carbs (grams)
- Fat (grams)
- Confidence level
- AI model used

And it's automatically stored in the database.

## Project structure

Nothing fancy. Everything where you expect it.

```
ai-macrolens/
├── supabase/
│   └── functions/
│       ├── analyze-meal/
│       │   ├── index.ts           # Main flow
│       │   ├── types.ts           # Types
│       │   ├── config.ts          # Limits and costs
│       │   ├── validators.ts      # Input checks
│       │   ├── gemini-helper.ts   # Gemini Vision
│       │   ├── openai-helper.ts   # OpenAI fallback
│       │   └── database.ts        # DB operations
│       └── import_map.json
├── DEPLOYMENT.md
├── EXAMPLES.md
└── README.md
```

## Quick start

**You'll need:**
- Supabase account
- Supabase CLI
- Gemini API key
- OpenAI API key (optional)

**Setup:**

1. Move into the project:
```bash
cd ai-macrolens
```

2. Link your Supabase project:
```bash
supabase link --project-ref <your-project-ref>
```

3. Set secrets:
```bash
supabase secrets set GEMINI_API_KEY=<your-gemini-key>
supabase secrets set OPENAI_API_KEY=<your-openai-key>
```

4. Deploy:
```bash
supabase functions deploy analyze-meal
```

## Try it out

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

More examples live in [EXAMPLES.md](EXAMPLES.md).

## API, briefly

**Endpoint:**
```
POST /functions/v1/analyze-meal
```

**Body:**
```json
{
  "user_id": "uuid",
  "image_url": "string",
  "description": "string (optional)"
}
```

**Success response:**
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

**When things go wrong:**

| Status | What happened |
|--------|---------------|
| 400 | Bad request |
| 401 | No JWT |
| 403 | User mismatch |
| 429 | Daily limit hit |
| 429 | Monthly budget hit |
| 500 | AI couldn't estimate |

## Database tables

**meals**

Stores every analyzed meal.

- `user_id`
- `image_url`
- `description`
- `calories`
- `protein`
- `carbs`
- `fat`
- `confidence`
- `source`
- `created_at`

**ai_usage**

Keeps the budget sane.

- `user_id`
- `usage_date`
- `calls`
- `estimated_cost`

## Configuration

All limits live in one place: `config.ts`

```typescript
export const CONFIG = {
  RATE_LIMIT_DAILY: 7,
  COST_LIMIT_MONTHLY_INR: 100,
  GEMINI_COST_PER_IMAGE_INR: 0.03,
  OPENAI_COST_PER_IMAGE_INR: 0.09,
  LOW_CONFIDENCE_THRESHOLD: 0.6,
};
```

## What happens internally

1. JWT is verified
2. User ID is checked
3. Daily limit is enforced
4. Monthly budget is checked
5. Image URL is validated
6. Gemini analyzes the image
7. OpenAI is used if needed
8. Results are saved
9. Usage is updated
10. JSON response is returned

Quietly. Reliably.

## Costs (roughly)

| Model | Cost per image |
|-------|----------------|
| Gemini Vision | ₹0.03 |
| GPT-4o-mini | ₹0.09 |

With limits in place:
- Max 210 calls per user per month (7/day × 30 days)
- Rough cost: ₹6.30 to ₹18.90 per user

## Local development

```bash
supabase start
supabase functions serve analyze-meal --env-file .env
```

Test locally:
```bash
curl http://localhost:54321/functions/v1/analyze-meal \
  --header 'Authorization: Bearer <local-jwt>' \
  --data '{"user_id":"...","image_url":"..."}'
```

Logs:
```bash
supabase functions logs analyze-meal --tail
```

## Security checklist

- ✅ API keys stored as secrets
- ✅ JWT required
- ✅ User isolation enforced
- ✅ RLS enabled
- ✅ Rate limiting active
- ✅ Budget cap enforced

## License

MIT

## Need help?

- Check [DEPLOYMENT.md](DEPLOYMENT.md)
- Look at [EXAMPLES.md](EXAMPLES.md)
- Read the logs
