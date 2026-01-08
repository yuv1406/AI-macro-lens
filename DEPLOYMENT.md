# AI Macro Analysis Backend - Deployment Guide

Complete deployment instructions for the Supabase Edge Function.

## Prerequisites

- Supabase account with a project created
- Supabase CLI installed: `npm install -g supabase`
- API keys:
  - **Gemini API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)
  - **OpenAI API Key** from [OpenAI Platform](https://platform.openai.com/api-keys)

## Step 1: Login to Supabase CLI

```bash
supabase login
```

This will open a browser window for authentication.

## Step 2: Link Your Project

```bash
cd c:/Users/yuvia/OneDrive/Desktop/ai-macrolens
supabase link --project-ref <your-project-ref>
```

Get your project ref from your Supabase dashboard URL:
`https://supabase.com/dashboard/project/<your-project-ref>`

## Step 3: Configure Secrets

Set the required API keys as Supabase secrets:

```bash
# Set Gemini API key
supabase secrets set GEMINI_API_KEY=<your-gemini-api-key>

# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=<your-openai-api-key>
```

**Verify secrets are set:**
```bash
supabase secrets list
```

## Step 4: Deploy the Edge Function

```bash
supabase functions deploy analyze-meal
```

This will:
- Upload all function code
- Configure the function endpoint
- Make it available at: `https://<project-ref>.supabase.co/functions/v1/analyze-meal`

## Step 5: Verify Deployment

The deployment will output the function URL. Test it with:

```bash
curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/analyze-meal' \
  --header 'Authorization: Bearer <anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"user_id":"test","image_url":"https://example.com/test.jpg"}'
```

## Step 6: Get Your Anon Key

Find your `anon` (public) key in:
- Supabase Dashboard → Settings → API → Project API keys → `anon public`

**Important:** The anon key is safe to use in mobile apps. User authentication is handled via JWT tokens.

## Environment Variables (Optional - Local Development)

For local testing, create a `.env` file:

```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
GEMINI_API_KEY=<your-gemini-key>
OPENAI_API_KEY=<your-openai-key>
```

Start local Supabase:
```bash
supabase start
supabase functions serve analyze-meal --env-file .env
```

## Monitoring & Logs

View function logs in real-time:

```bash
supabase functions logs analyze-meal --tail
```

Or in the dashboard:
- Supabase Dashboard → Edge Functions → analyze-meal → Logs

## Troubleshooting

### "GEMINI_API_KEY not configured"
- Ensure secrets are set: `supabase secrets set GEMINI_API_KEY=...`
- Redeploy after setting secrets: `supabase functions deploy analyze-meal`

### "Unauthorized" errors
- Check that the Authorization header contains a valid JWT from Supabase Auth
- Users must be authenticated via `supabase.auth.signInWithPassword()` or similar

### Rate limit / Cost limit errors
- These are expected behaviors
- Check `ai_usage` table: `SELECT * FROM ai_usage ORDER BY usage_date DESC;`

### AI analysis fails
- Check image URL is accessible
- Verify API keys are valid
- Check function logs for detailed error messages

## Database Verification

Connect to your database and verify the schema:

```sql
-- Check ai_usage table
SELECT * FROM ai_usage ORDER BY usage_date DESC LIMIT 10;

-- Check meals table  
SELECT * FROM meals ORDER BY created_at DESC LIMIT 10;

-- Check daily usage for a user
SELECT * FROM ai_usage WHERE user_id = '<user-id>' AND usage_date = CURRENT_DATE;
```

## Security Notes

✅ **API keys are stored as Supabase secrets** - never exposed to clients
✅ **Row Level Security (RLS)** should be enabled on `meals` and `ai_usage` tables
✅ **JWT authentication** required for all requests
✅ **User ID validation** ensures users can only analyze their own meals

## Cost Monitoring

Current configuration:
- **Daily limit:** 5 AI calls per user
- **Monthly limit:** ₹80 total cost
- **Estimated costs:**
  - Gemini: ₹0.03 per image
  - OpenAI: ₹0.09 per image

Monitor costs with:
```sql
SELECT 
  SUM(estimated_cost) as total_cost,
  COUNT(*) as total_calls,
  MIN(usage_date) as first_call,
  MAX(usage_date) as last_call
FROM ai_usage
WHERE usage_date >= DATE_TRUNC('month', CURRENT_DATE);
```
