'use server';

import { suggestColumnMapping, type SuggestColumnMappingInput, type SuggestColumnMappingOutput } from '@/ai/flows/suggest-column-mapping';

export async function getAISuggestions(input: SuggestColumnMappingInput): Promise<SuggestColumnMappingOutput & { error?: string }> {
    try {
        const result = await suggestColumnMapping(input);
        return result;
    } catch (error) {
        return { 
            error: 'Failed to get AI suggestions. Please try again.',
            suggestedMappings: {},
            confidenceScores: {}
        };
    }
}

export async function verifyEditPassword(password: string): Promise<{ success: boolean }> {
    const secret = process.env.DASHBOARD_EDIT_PASSWORD;
    if (!secret) {
        // If no password is set, deny access by default for security.
        return { success: false };
    }
    return { success: password === secret };
}