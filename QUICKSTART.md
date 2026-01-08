# Quick Start - Gemini Only (No OpenAI Required)

Start using the backend with just your Gemini API key. OpenAI is optional!

## Prerequisites

✅ Supabase project already set up with database  
✅ Gemini API key from https://makersuite.google.com/app/apikey  
⚠️ npx supabase CLI ready to use

## Step-by-Step Deployment

### 1. Login to Supabase

In your terminal (press Enter when prompted):
```bash
npx supabase login
```

This will open a browser for authentication.

---

### 2. Link Your Project

Find your project ref from your Supabase dashboard URL:
```
https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>
```

Then run:
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

---

### 3. Set Gemini API Key

```bash
npx supabase secrets set GEMINI_API_KEY=your_actual_gemini_key
```

Verify it's set:
```bash
npx supabase secrets list
```

---

### 4. Deploy the Function

```bash
npx supabase functions deploy analyze-meal
```

This will output your function URL:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze-meal
```

---

### 5. Test It

Get your anon key from: **Supabase Dashboard → Settings → API → anon public**

Get a user JWT token by authenticating:
```bash
curl --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/auth/v1/token?grant_type=password' \
  --header 'apikey: YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "your_user@example.com",
    "password": "password123"
  }'
```

Copy the `access_token` from the response.

Test the function:
```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze-meal' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'apikey: YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "user_id": "YOUR_USER_ID",
    "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    "description": "Dal and rice"
  }'
```

---

## What Works with Gemini Only?

✅ Full macro analysis (calories, protein, carbs, fat)  
✅ Confidence scoring  
✅ Rate limiting (5/day per user)  
✅ Cost controls (₹80/month)  
✅ Database saving  
✅ All error handling

**What happens if Gemini returns low confidence?**
- Without OpenAI: Uses Gemini result anyway, logs a message
- With OpenAI (if added later): Automatically falls back to OpenAI

---

## Adding OpenAI Later (Optional)

If you want the OpenAI fallback later:
```bash
npx supabase secrets set OPENAI_API_KEY=your_openai_key
```

No redeployment needed - it will automatically use OpenAI as fallback!

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npx supabase login` | Authenticate CLI |
| `npx supabase link --project-ref <ref>` | Link to project |
| `npx supabase secrets set GEMINI_API_KEY=<key>` | Set API key |
| `npx supabase secrets list` | View secrets |
| `npx supabase functions deploy analyze-meal` | Deploy function |
| `npx supabase functions logs analyze-meal --tail` | View logs |

---

## Troubleshooting

**"GEMINI_API_KEY not configured"**
- Run: `npx supabase secrets set GEMINI_API_KEY=your_key`
- Redeploy: `npx supabase functions deploy analyze-meal`

**"Unauthorized"**
- Make sure JWT token is valid and not expired
- User must be authenticated via Supabase Auth

**Function deploys but doesn't work**
- Check logs: `npx supabase functions logs analyze-meal`
- Verify image URL is accessible
- Check Gemini API key is valid

---

## Next Steps

1. ✅ Press Enter in terminal to complete login
2. ✅ Run `link` command with your project ref
3. ✅ Set Gemini API key
4. ✅ Deploy!
5. 🎉 Test with a meal image
