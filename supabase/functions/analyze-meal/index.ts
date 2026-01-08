// Main Edge Function: analyze-meal
// Analyzes meal images using AI and returns macro estimates

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { validateRequest, validateImageUrl, ValidationError } from './validators.ts';
import { analyzeWithGemini } from './gemini-helper.ts';
import { analyzeTextWithGemini } from './gemini-text-helper.ts';
import { analyzeWithOpenAI } from './openai-helper.ts';
import {
    getDailyUsageCount,
    getMonthlyEstimatedCost,
    recordAIUsage,
    saveMeal,
} from './database.ts';
import { CONFIG } from './config.ts';
import { AnalyzeMealResponse, ErrorResponse, MacroEstimate, AIModel } from './types.ts';

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        });
    }

    try {
        // Only accept POST requests
        if (req.method !== 'POST') {
            return jsonError('Method not allowed', 405);
        }

        // Validate authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.error('Missing authorization header');
            return jsonError('Missing authorization header', 401);
        }

        // Extract JWT token from Authorization header
        const token = authHeader.replace('Bearer ', '');
        console.log('JWT token extracted');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        // Validate JWT token by passing it directly to getUser()
        console.log('Validating JWT token...');
        const {
            data: { user },
            error: authError,
        } = await supabaseClient.auth.getUser(token);

        if (authError) {
            console.error('Auth error:', authError);
            return jsonError('Unauthorized', 401, authError.message);
        }

        if (!user) {
            console.error('No user returned from auth');
            return jsonError('Unauthorized', 401);
        }

        console.log('✅ User authenticated:', user.id);

        // Parse and validate request
        const body = await req.json();
        const requestData = validateRequest(body);

        // Verify user_id matches authenticated user
        if (requestData.user_id !== user.id) {
            return jsonError('user_id does not match authenticated user', 403);
        }

        // Check rate limit
        const dailyUsage = await getDailyUsageCount(user.id);
        if (dailyUsage >= CONFIG.RATE_LIMIT_DAILY) {
            return jsonError('Daily rate limit exceeded. Max 5 AI analyses per day.', 429);
        }

        // Check cost guard
        const monthlyCost = await getMonthlyEstimatedCost();
        if (monthlyCost >= CONFIG.COST_LIMIT_MONTHLY_INR) {
            return jsonError(
                `Monthly cost limit reached(₹${CONFIG.COST_LIMIT_MONTHLY_INR}).Please try again next month.`,
                429
            );
        }

        // Validate image URL accessibility (only if image_url provided)
        if (requestData.image_url) {
            await validateImageUrl(requestData.image_url);
        }

        // Analyze with AI
        let macros: MacroEstimate;
        let aiModel: AIModel;

        // Check if OpenAI is configured (only needed for image analysis fallback)
        const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');

        // Branch: Image analysis vs Text-only analysis
        if (requestData.image_url) {
            // IMAGE ANALYSIS MODE
            console.log('Image analysis mode');
            try {
                // Try Gemini first
                console.log('Attempting image analysis with Gemini...');
                macros = await analyzeWithGemini(requestData.image_url, requestData.description);
                aiModel = 'gemini';

                // Check if confidence is too low - fallback to OpenAI (if configured)
                if (macros.confidence === 'low' && hasOpenAI) {
                    console.log('Gemini returned low confidence, falling back to OpenAI...');
                    try {
                        const openAIMacros = await analyzeWithOpenAI(requestData.image_url, requestData.description);

                        // Use OpenAI result if it has higher confidence
                        if (openAIMacros.confidence !== 'low') {
                            macros = openAIMacros;
                            aiModel = 'openai';
                            console.log('OpenAI provided better confidence, using OpenAI result');
                        } else {
                            console.log('Both models returned low confidence, using Gemini result');
                        }
                    } catch (openAIError) {
                        console.error('OpenAI fallback failed:', openAIError);
                        // Continue with Gemini result
                    }
                } else if (macros.confidence === 'low' && !hasOpenAI) {
                    console.log('Gemini returned low confidence, but OpenAI not configured. Using Gemini result.');
                }
            } catch (geminiError) {
                console.error('Gemini analysis failed:', geminiError);

                // Fallback to OpenAI (if configured)
                if (hasOpenAI) {
                    try {
                        console.log('Falling back to OpenAI due to Gemini failure...');
                        macros = await analyzeWithOpenAI(requestData.image_url, requestData.description);
                        aiModel = 'openai';
                    } catch (openAIError) {
                        console.error('OpenAI fallback also failed:', openAIError);
                        return jsonError('unable_to_estimate', 500, 'AI model failed to analyze the image');
                    }
                } else {
                    console.error('Gemini failed and OpenAI not configured');
                    return jsonError('unable_to_estimate', 500, 'AI analysis failed. Please check the image and try again.');
                }
            }
        } else if (requestData.description) {
            // TEXT-ONLY ANALYSIS MODE
            console.log('Text-only analysis mode');
            try {
                console.log('Analyzing text description with Gemini...');
                macros = await analyzeTextWithGemini(requestData.description);
                aiModel = 'gemini';
            } catch (textAnalysisError) {
                console.error('Text analysis failed:', textAnalysisError);
                return jsonError('unable_to_estimate', 500, 'Failed to analyze meal description. Please provide more details.');
            }
        } else {
            // This should never happen due to validation, but just in case
            return jsonError('invalid_request', 400, 'Either image_url or description must be provided');
        }

        // Additional validation - reject if it doesn't look like food
        if (macros.calories === 0 || (macros.protein === 0 && macros.carbs === 0 && macros.fat === 0)) {
            return jsonError('unable_to_estimate', 400, 'Image does not appear to contain food');
        }

        // NOTE: We do NOT save the meal here anymore - the mobile app will save it
        // This prevents duplicate entries (one from Edge Function, one from app)
        // The Edge Function should ONLY analyze and return data

        // Record AI usage for rate limiting
        await recordAIUsage(user.id, aiModel);

        // Return success response
        const response: AnalyzeMealResponse = {
            calories: macros.calories,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
            confidence: macros.confidence,
            meal_description: macros.meal_description,  // AI-generated description
            source: 'ai',
            ai_model_used: aiModel,
        };

        return jsonResponse(response);

    } catch (error) {
        console.error('Error processing request:', error);

        if (error instanceof ValidationError) {
            return jsonError(error.message, 400);
        }

        if (error.name === 'TimeoutError') {
            return jsonError('Request timeout', 504);
        }

        return jsonError('Internal server error', 500, error.message);
    }
});

/**
 * Helper to return JSON response
 */
function jsonResponse(data: AnalyzeMealResponse, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}

/**
 * Helper to return error response
 */
function jsonError(error: string, status = 500, details?: string): Response {
    const body: ErrorResponse = { error };
    if (details) {
        body.details = details;
    }

    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
