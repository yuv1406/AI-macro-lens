// Gemini Text-Only Analysis (no image)
// For manual entry where users describe meals with quantities

import { MacroEstimate } from './types.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const TEXT_ANALYSIS_PROMPT = `You are a nutrition analysis AI specializing in Indian meals. Parse text descriptions and estimate macronutrients.

INPUT: User provides meal description with quantities (e.g., "300g rice with 200g dal and 1 tablespoon ghee")

PARSING RULES:
1. Extract each food item with its quantity
2. Understand common units:
   - Weight: g, kg, grams, kilograms
   - Volume: ml, l, cup, cups, tablespoon (tbsp), teaspoon (tsp)
   - Indian measurements: katori (~150ml), vati (~100ml), roti (30-40g each)
   - Pieces: roti, chapati, naan, eggs, etc.
3. Convert measurements to grams/ml for calculation
4. For each component, estimate macros based on:
   - Food type (rice, dal, vegetables, meat, etc.)
   - Portion size
   - Cooking method if mentioned (fried, boiled, raw)
   - Added fats if mentioned (oil, ghee, butter)
5. Sum all components for final totals

MACRO ESTIMATION:
- Use standard nutritional databases for Indian foods
- Be conservative with added fats unless explicitly stated
- Account for cooking methods (fried adds 10-15g fat per serving)
- For ambiguous descriptions, use medium confidence

CONFIDENCE LEVELS:
- "high": Clear quantities, specific food items, cooking method mentioned
- "medium": Quantities present but some ambiguity in preparation
- "low": Vague quantities ("some", "little"), unclear food items

RESPOND WITH ONLY VALID JSON - no explanation, no markdown:
{
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "confidence": "low" | "medium" | "high",
  "meal_description": "<brief summary of parsed items>"
}

EXAMPLES:

Input: "300g rice with 200g dal and 1 tablespoon ghee"
Output: {"calories": 850, "protein": 24, "carbs": 145, "fat": 15, "confidence": "high", "meal_description": "Rice (300g), dal (200g), ghee (1 tbsp)"}

Input: "2 roti with sabzi"
Output: {"calories": 280, "protein": 8, "carbs": 50, "fat": 5, "confidence": "medium", "meal_description": "2 roti with mixed vegetables"}`;

/**
 * Analyzes meal description text (no image) using Gemini API
 */
export async function analyzeTextWithGemini(
    description: string
): Promise<MacroEstimate> {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    if (!description || description.trim().length < 5) {
        throw new Error('Description too short for analysis');
    }

    try {
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
                                { text: TEXT_ANALYSIS_PROMPT },
                                { text: `Analyze this meal description:\n\n"${description}"\n\nProvide macro estimates in JSON format.` },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.3, // Lower temperature for more consistent parsing
                        maxOutputTokens: 2048, // Increased from 512 to prevent truncation
                    },
                }),
                signal: AbortSignal.timeout(40000), // 40 seconds for text analysis (increased from 15s)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Extract text from response
        const candidate = data.candidates?.[0];
        if (!candidate) {
            throw new Error('No candidate in Gemini response');
        }

        const parts = candidate.content?.parts;
        if (!parts || parts.length === 0) {
            throw new Error('No parts in Gemini response');
        }

        const text = parts.map((part: any) => part.text || '').join('');
        if (!text) {
            throw new Error('No text in Gemini response');
        }

        console.log('Gemini text analysis response:', text);

        // Parse JSON response
        const result = parseTextAnalysisResponse(text);
        return result;
    } catch (error) {
        console.error('Gemini text analysis failed:', error);
        throw error;
    }
}

/**
 * Parses and validates text analysis response
 */
function parseTextAnalysisResponse(text: string): MacroEstimate {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/, '');
    cleaned = cleaned.replace(/\s*```$/, '');
    cleaned = cleaned.trim();

    // Extract JSON object if embedded in text
    if (!cleaned.startsWith('{')) {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }
    }

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (parseError) {
        console.error('JSON parse failed:', parseError);
        console.error('Attempted to parse:', cleaned);

        // Check if response appears truncated
        if (cleaned.endsWith(',') || !cleaned.endsWith('}')) {
            throw new Error(`AI response appears truncated. Received: ${cleaned.substring(0, 100)}...`);
        }

        throw new Error(`Failed to parse AI response as JSON. Response: ${cleaned.substring(0, 200)}`);
    }

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
        meal_description: parsed.meal_description || undefined,
    };
}
