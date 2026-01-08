// Type definitions for analyze-meal Edge Function

export interface AnalyzeMealRequest {
    user_id: string;
    image_url?: string; // Optional - not needed for text-only analysis
    description?: string;
}

export interface AnalyzeMealResponse {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: 'low' | 'medium' | 'high';
    meal_description?: string;  // AI-generated description of the meal
    source: 'ai';
    ai_model_used?: 'gemini' | 'openai';
}

export interface ErrorResponse {
    error: string;
    details?: string;
}

export interface MacroEstimate {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: 'low' | 'medium' | 'high';
    meal_description?: string;  // Brief 1-2 line description of food items
}

export type AIModel = 'gemini' | 'openai';

export interface AIUsageRecord {
    user_id: string;
    usage_date: string;
    calls: number;
    estimated_cost: number;
}
