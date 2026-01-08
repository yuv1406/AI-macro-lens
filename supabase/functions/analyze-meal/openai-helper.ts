// OpenAI GPT-4o-mini Vision API integration

import { MacroEstimate } from './types.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const SYSTEM_PROMPT = `You are a nutrition analysis AI specializing in Indian home-cooked meals.

Analyze the provided food image and estimate the macronutrients.

STRICT RULES:
1. Assume home-cooked Indian food unless clearly otherwise
2. Be CONSERVATIVE with oil, ghee, and butter estimates
3. Use realistic portion sizes based on what's visible
4. If the image is unclear, blurry, or doesn't show food clearly, set confidence to "low"
5. If you cannot identify the food at all, return confidence "low" with conservative estimates
6. RESPOND WITH ONLY VALID JSON - no explanation, no markdown, no formatting

JSON STRUCTURE (respond with ONLY this, nothing else):
{
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "confidence": "low" | "medium" | "high"
}

CONFIDENCE LEVELS:
- "high": Clear image, recognizable dishes, standard portions
- "medium": Partially visible, familiar food but uncertain portions
- "low": Unclear image, unrecognizable food, or very uncertain`;

/**
 * Analyzes a meal image using OpenAI GPT-4o-mini Vision API
 */
export async function analyzeWithOpenAI(
    imageUrl: string,
    description?: string
): Promise<MacroEstimate> {
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured (OpenAI is optional)');
    }

    const userContent = description
        ? `🔍 USER PROVIDED MEAL DETAILS: "${description}"

CRITICAL INSTRUCTIONS:
1. The user has explicitly identified this meal as "${description}"
2. TRUST the user's description - they know what they cooked/ate
3. Use their description to correctly identify the dish and estimate macros more accurately
4. If the image matches their description, use HIGH confidence

Provide macro estimates in JSON format only.`
        : 'Provide macro estimates in JSON format only.';

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: SYSTEM_PROMPT,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: userContent,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageUrl,
                                    detail: 'low', // Use low detail for cost savings
                                },
                            },
                        ],
                    },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.4,
                max_tokens: 256,
            }),
            signal: AbortSignal.timeout(40000), // 40 seconds for OpenAI fallback (increased from 20s)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Extract response
        const text = data.choices?.[0]?.message?.content;
        if (!text) {
            throw new Error('No response from OpenAI');
        }

        // Parse JSON response
        const result = parseAIResponse(text);
        return result;
    } catch (error) {
        console.error('OpenAI analysis failed:', error);
        throw error;
    }
}

/**
 * Parses and validates AI response
 */
function parseAIResponse(text: string): MacroEstimate {
    const parsed = JSON.parse(text.trim());

    // Validate structure
    if (
        typeof parsed.calories !== 'number' ||
        typeof parsed.protein !== 'number' ||
        typeof parsed.carbs !== 'number' ||
        typeof parsed.fat !== 'number' ||
        !['low', 'medium', 'high'].includes(parsed.confidence)
    ) {
        throw new Error('Invalid response structure from AI');
    }

    return {
        calories: Math.round(parsed.calories),
        protein: Math.round(parsed.protein * 10) / 10,
        carbs: Math.round(parsed.carbs * 10) / 10,
        fat: Math.round(parsed.fat * 10) / 10,
        confidence: parsed.confidence,
    };
}
