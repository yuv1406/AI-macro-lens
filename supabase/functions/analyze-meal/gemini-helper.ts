// Gemini Vision API integration

import { MacroEstimate } from './types.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const SYSTEM_PROMPT = `You are a nutrition analysis AI specializing in Indian home-cooked meals. Analyze the provided food image and estimate macronutrients with maximum accuracy.

STRICT RULES:
1. Assume home-cooked Indian food unless clearly restaurant-style or packaged
2. Be CONSERVATIVE with oil/ghee/butter estimates (home cooking typically uses 1-2 tsp per serving, not restaurant amounts)
3. Estimate portion sizes using visual cues: compare to standard serving vessels (katori ~100-150ml, plate sections, roti size ~30-40g)
4. For rice: assume 1 cup cooked = ~150-200g. For roti: 1 medium = ~30-40g
5. For dals/curries: estimate the gravy-to-solid ratio to assess added fats
6. For mixed dishes (biryani, pulao): account for rice, protein, vegetables, and cooking fat separately
7. If multiple items visible, analyze each component separately then sum totals
8. Set confidence "low" if: image is blurry, lighting is poor, portion size unclear, or food items unidentifiable
9. Include fiber estimate (crucial for satiety and accurate tracking)
10. RESPOND WITH ONLY VALID JSON - no explanation, markdown, or formatting


JSON STRUCTURE (respond with ONLY this, nothing else):
{
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "confidence": "low" | "medium" | "high",
  "meal_description": "<brief 1-2 line description of food items>"
}

CONFIDENCE LEVELS:
- "high": Clear image, recognizable dishes, standard portions
- "medium": Partially visible, familiar food but uncertain portions
- "low": Unclear image, unrecognizable food, or very uncertain

MEAL DESCRIPTION: Identify the main food items (e.g., "Dal rice with roti" or "Chicken curry with naan")`;

/**
 * Analyzes a meal image using Gemini Vision API
 */
export async function analyzeWithGemini(
    imageUrl: string,
    description?: string
): Promise<MacroEstimate> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    // Build user prompt with description as context for better accuracy
    const userPrompt = description
        ? `🔍 USER PROVIDED MEAL DETAILS: "${description}"

CRITICAL INSTRUCTIONS:
1. The user has explicitly identified this meal as "${description}"
2. TRUST the user's description - they know what they cooked/ate
3. Use their description to:
   - Correctly identify dishes that look similar (e.g., kadhi vs dal, different curries)
   - Understand preparation method (home-cooked vs restaurant, fried vs baked)
   - Determine ingredients that may not be visible (spices, hidden vegetables, cooking fats)
4. If the image matches their description, use HIGH confidence
5. If there's a mismatch between image and description, note it but prioritize the description

Analyze the image with the user's context and provide accurate macro estimates in JSON format.`
        : `Analyze this meal image and provide macro estimates in JSON format.`;

    try {
        // Using Gemini 2.5 Flash as per user telemetry (optimized for high volume)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: SYSTEM_PROMPT },
                                { text: userPrompt },
                                {
                                    inline_data: {
                                        mime_type: 'image/jpeg',
                                        data: await fetchImageAsBase64(imageUrl),
                                    },
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 4096, // Increased from 256 to prevent truncation
                    },
                    safetySettings: [
                        {
                            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                            threshold: 'BLOCK_ONLY_HIGH',
                        },
                    ],
                }),
                signal: AbortSignal.timeout(50000), // 50 seconds for Gemini API (increased from 30s)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        console.log('Gemini API response structure:', JSON.stringify(data, null, 2));

        // Extract all text parts from response
        const candidate = data.candidates?.[0];
        if (!candidate) {
            throw new Error('No candidate in Gemini response');
        }

        const parts = candidate.content?.parts;
        if (!parts || parts.length === 0) {
            throw new Error('No parts in Gemini response');
        }

        // Concatenate all text parts (Gemini may split response across multiple parts)
        const text = parts.map((part: any) => part.text || '').join('');

        if (!text) {
            throw new Error('No text in Gemini response');
        }

        console.log('Extracted full text from Gemini:', text);

        // Parse JSON response
        const result = parseAIResponse(text);
        return result;
    } catch (error) {
        console.error('Gemini analysis failed:', error);
        throw error;
    }
}

/**
 * Fetches image and converts to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) }); // 30 seconds for image fetch (increased from 20s)
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Convert to base64 efficiently using chunking to avoid stack limits for large images
    return btoa(
        bytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
}

/**
 * Parses and validates AI response
 */
function parseAIResponse(text: string): MacroEstimate {
    console.log('Raw Gemini response:', text);

    // Remove markdown code blocks if present
    let cleaned = text.trim();

    // Try multiple cleaning strategies
    // Strategy 1: Remove ```json and ``` markers
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```jsons\s*/i, ''); // Handle typo "jsons"
    cleaned = cleaned.replace(/^```\s*/, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    cleaned = cleaned.trim();

    // Strategy 2: Extract JSON object using regex if still malformed
    if (!cleaned.startsWith('{')) {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }
    }

    console.log('Cleaned JSON string:', cleaned);

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (parseError) {
        console.error('JSON parse failed:', parseError);
        console.error('Attempted to parse:', cleaned);
        throw new Error(`Failed to parse AI response as JSON: ${(parseError as any).message}`);
    }

    // Validate structure
    if (
        typeof parsed.calories !== 'number' ||
        typeof parsed.protein !== 'number' ||
        typeof parsed.carbs !== 'number' ||
        typeof parsed.fat !== 'number' ||
        !['low', 'medium', 'high'].includes(parsed.confidence)
    ) {
        console.error('Invalid structure:', JSON.stringify(parsed));
        throw new Error('Invalid response structure from AI');
    }

    return {
        calories: Math.round(parsed.calories),
        protein: Math.round(parsed.protein * 10) / 10,
        carbs: Math.round(parsed.carbs * 10) / 10,
        fat: Math.round(parsed.fat * 10) / 10,
        confidence: parsed.confidence,
        meal_description: parsed.meal_description || undefined,  // Optional field
    };
}
