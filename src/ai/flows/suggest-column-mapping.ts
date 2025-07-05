'use server';

/**
 * @fileOverview An AI agent that suggests column mappings based on Excel data.
 *
 * - suggestColumnMapping - A function that handles the column mapping suggestion process.
 * - SuggestColumnMappingInput - The input type for the suggestColumnMapping function.
 * - SuggestColumnMappingOutput - The return type for the suggestColumnMapping function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestColumnMappingInputSchema = z.object({
  columnHeaders: z
    .array(z.string())
    .describe("An array of strings representing the column headers from the user's uploaded file."),
  templateFields: z
    .array(z.string())
    .describe("An array of strings representing the required data fields for the selected dashboard template."),
});
export type SuggestColumnMappingInput = z.infer<typeof SuggestColumnMappingInputSchema>;

const SuggestColumnMappingOutputSchema = z.object({
  suggestedMappings: z
    .record(z.string(), z.string())
    .describe("A record (key-value object) where each key is a template field and the value is the suggested column name from the Excel data."),
  confidenceScores: z
    .record(z.string(), z.number().min(0).max(1))
    .describe("A record where each key is a template field and the value is a number between 0 and 1 representing the confidence level of the suggested mapping."),
});
export type SuggestColumnMappingOutput = z.infer<typeof SuggestColumnMappingOutputSchema>;

export async function suggestColumnMapping(input: SuggestColumnMappingInput): Promise<SuggestColumnMappingOutput> {
  return suggestColumnMappingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestColumnMappingPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: {schema: SuggestColumnMappingInputSchema},
  output: {schema: SuggestColumnMappingOutputSchema},
  prompt: `You are an intelligent data mapping assistant. Your task is to analyze a list of column headers from a user's file and a list of required fields for a dashboard template, then suggest mappings between them.

Follow these instructions carefully:
1.  **Analyze the Headers**: Review the provided \`Column Headers\` to understand the data they represent.
2.  **Understand the Target**: Review the \`Template Fields\` which are the required data points for a dashboard.
3.  **Generate Mappings**: For each \`Template Field\`, you MUST find the best matching header from the \`Column Headers\`. Base your matching on the semantic meaning of the headers. You must provide a mapping for every template field.
4.  **Provide Confidence**: For each mapping, provide a confidence score from 0.0 to 1.0, where 1.0 is a perfect match and 0.0 is low confidence.
5.  **Format Output**: You MUST respond with ONLY a valid JSON object that adheres to the defined output schema. Do not include any explanatory text, markdown formatting, or anything else outside of the JSON object. Your JSON output must use the template fields provided as keys.

**Column Headers:**
{{#each columnHeaders}}
- \`{{{this}}}\`
{{/each}}

**Template Fields:**
{{#each templateFields}}
- \`{{{this}}}\`
{{/each}}
`,
});

const suggestColumnMappingFlow = ai.defineFlow(
  {
    name: 'suggestColumnMappingFlow',
    inputSchema: SuggestColumnMappingInputSchema,
    outputSchema: SuggestColumnMappingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
