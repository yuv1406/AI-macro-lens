// Configuration constants for the analyze-meal function

export const CONFIG = {
    // Rate limiting
    RATE_LIMIT_DAILY: 7,

    // Cost controls (in INR) - TODO: RESTORE TO 80 BEFORE PRODUCTION!
    COST_LIMIT_MONTHLY_INR: 100,  // Temporarily disabled for development

    // Estimated costs per image (in INR)
    // Gemini Flash Vision: ~$0.0003-0.0005 per image = ₹0.025-0.04
    GEMINI_COST_PER_IMAGE_INR: 0.03,

    // OpenAI GPT-4o-mini Vision: ~$0.001 per image = ₹0.08-0.10
    OPENAI_COST_PER_IMAGE_INR: 0.09,

    // Confidence thresholds
    LOW_CONFIDENCE_THRESHOLD: 0.6,

    // API timeouts (milliseconds)
    GEMINI_TIMEOUT_MS: 30000,  // Increased from 15s to 30s to handle image encoding
    OPENAI_TIMEOUT_MS: 20000,
} as const;
