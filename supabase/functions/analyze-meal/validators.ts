// Input validation utilities

import { AnalyzeMealRequest } from './types.ts';

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Validates the request payload
 */
export function validateRequest(data: unknown): AnalyzeMealRequest {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Request body must be a JSON object');
    }

    const req = data as Record<string, unknown>;

    // Validate user_id
    if (!req.user_id || typeof req.user_id !== 'string') {
        throw new ValidationError('user_id is required and must be a string');
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.user_id)) {
        throw new ValidationError('user_id must be a valid UUID');
    }

    // Validate image_url (optional - required if no description)
    if (req.image_url !== undefined && typeof req.image_url !== 'string') {
        throw new ValidationError('image_url must be a string if provided');
    }

    if (req.image_url && !isValidUrl(req.image_url)) {
        throw new ValidationError('image_url must be a valid HTTP/HTTPS URL');
    }

    // Validate description (optional - required if no image_url)
    if (req.description !== undefined && typeof req.description !== 'string') {
        throw new ValidationError('description must be a string if provided');
    }

    // At least one of image_url or description must be provided
    if (!req.image_url && !req.description) {
        throw new ValidationError('Either image_url or description must be provided');
    }

    // If using text-only mode, description must be meaningful
    if (!req.image_url && req.description) {
        if (req.description.trim().length < 10) {
            throw new ValidationError('Description must be at least 10 characters for text-only analysis');
        }
    }

    return {
        user_id: req.user_id,
        image_url: req.image_url as string | undefined,
        description: req.description as string | undefined,
    };
}

/**
 * Validates URL format
 */
function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validates image URL accessibility (basic check)
 */
export async function validateImageUrl(url: string): Promise<void> {
    try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });

        if (!response.ok) {
            throw new ValidationError(`Image URL returned status ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.startsWith('image/')) {
            throw new ValidationError('URL does not point to an image');
        }
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError(`Failed to access image URL: ${error.message}`);
    }
}
