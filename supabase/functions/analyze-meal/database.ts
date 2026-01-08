// Database helper functions for Supabase operations

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { MacroEstimate, AIModel } from './types.ts';
import { CONFIG } from './config.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Get daily AI usage count for a user
 */
export async function getDailyUsageCount(userId: string): Promise<number> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data, error } = await supabase
        .from('ai_usage')
        .select('calls')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .single();

    if (error) {
        // No record for today yet
        if (error.code === 'PGRST116') {
            return 0;
        }
        throw error;
    }

    return data?.calls || 0;
}

/**
 * Get monthly estimated cost in INR
 */
export async function getMonthlyEstimatedCost(): Promise<number> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

    const { data, error } = await supabase
        .from('ai_usage')
        .select('estimated_cost')
        .gte('usage_date', firstDayOfMonth);

    if (error) throw error;

    const totalCost = data?.reduce((sum, record) => sum + (Number(record.estimated_cost) || 0), 0) || 0;
    return totalCost;
}

/**
 * Record AI usage and increment daily counter
 */
export async function recordAIUsage(
    userId: string,
    model: AIModel
): Promise<void> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];
    const cost = model === 'gemini'
        ? CONFIG.GEMINI_COST_PER_IMAGE_INR
        : CONFIG.OPENAI_COST_PER_IMAGE_INR;

    // Try to update existing record
    const { data: existing } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .single();

    if (existing) {
        // Update existing record
        const { error } = await supabase
            .from('ai_usage')
            .update({
                calls: existing.calls + 1,
                estimated_cost: Number(existing.estimated_cost) + cost,
            })
            .eq('user_id', userId)
            .eq('usage_date', today);

        if (error) throw error;
    } else {
        // Insert new record
        const { error } = await supabase
            .from('ai_usage')
            .insert({
                user_id: userId,
                usage_date: today,
                calls: 1,
                estimated_cost: cost,
            });

        if (error) throw error;
    }
}

/**
 * Save meal to database
 */
export async function saveMeal(
    userId: string,
    imageUrl: string,
    description: string | undefined,
    macros: MacroEstimate,
    aiModel: AIModel
): Promise<string> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
        .from('meals')
        .insert({
            user_id: userId,
            image_url: imageUrl,
            description: description || null,
            calories: macros.calories,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
            confidence: macros.confidence,
            source: 'ai',
            // Note: ai_model_used column doesn't exist in current schema
            // Can be added later if needed
        })
        .select('id')
        .single();

    if (error) throw error;

    return data.id;
}
