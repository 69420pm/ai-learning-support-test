import { describe, expect, it } from 'vitest';
import {
  CONCEPT_GRAPH_EXTRACTION_PROMPT,
  MATERIAL_VISION_INGESTION_PROMPT,
  systemPrompt,
  titlePrompt,
} from './prompts';

describe('AI Prompts', () => {
  it('systemPrompt includes grounded tool instruction, citation format, and gap disclosure', () => {
    expect(systemPrompt).toContain('searchProjectMaterials');
    expect(systemPrompt).toContain('**[Material Title, Page X]**');
    expect(systemPrompt.toLowerCase()).toContain('missing');
  });

  it('titlePrompt, MATERIAL_VISION_INGESTION_PROMPT, and CONCEPT_GRAPH_EXTRACTION_PROMPT are properly defined', () => {
    expect(titlePrompt).toContain('Generate a short chat title');
    expect(MATERIAL_VISION_INGESTION_PROMPT).toContain('transcription engine');
    expect(CONCEPT_GRAPH_EXTRACTION_PROMPT).toContain('pedagogical knowledge engineer');
    expect(CONCEPT_GRAPH_EXTRACTION_PROMPT).toContain('PACER');
  });

  it('CONCEPT_GRAPH_EXTRACTION_PROMPT contains practice problem and exercise extraction rules', () => {
    expect(CONCEPT_GRAPH_EXTRACTION_PROMPT).toMatch(/exercises?|practice problems?/i);
    expect(CONCEPT_GRAPH_EXTRACTION_PROMPT).toContain('pageNumber');
    expect(CONCEPT_GRAPH_EXTRACTION_PROMPT).toContain('questionType');
    expect(CONCEPT_GRAPH_EXTRACTION_PROMPT).toContain('difficulty');
    expect(CONCEPT_GRAPH_EXTRACTION_PROMPT).toMatch(/solution/i);
    expect(CONCEPT_GRAPH_EXTRACTION_PROMPT).toMatch(/unsolved|hallucinat/i);
  });

  it('CONCEPT_GRAPH_EXTRACTION_PROMPT instructs LLM to reuse existing concept names', () => {
    expect(CONCEPT_GRAPH_EXTRACTION_PROMPT).toContain(
      'Reuse existing concept names whenever the text discusses a concept already in the vocabulary. Only create a new concept name if the concept is genuinely distinct.',
    );
  });

  it('buildConceptExtractionPrompt formats prompt with existing vocabulary and grounding instruction', async () => {
    const { buildConceptExtractionPrompt } = await import('./prompts');

    const promptWithVocab = buildConceptExtractionPrompt({
      content: 'Sample text about trees',
      existingVocabulary: ['Binary Search Tree', 'AVL Tree'],
    });

    expect(promptWithVocab).toContain('Binary Search Tree');
    expect(promptWithVocab).toContain('AVL Tree');
    expect(promptWithVocab).toContain(
      'Reuse existing concept names whenever the text discusses a concept already in the vocabulary. Only create a new concept name if the concept is genuinely distinct.',
    );
    expect(promptWithVocab).toContain('Sample text about trees');

    const promptWithoutVocab = buildConceptExtractionPrompt({
      content: 'Sample text about graphs',
      existingVocabulary: [],
    });

    expect(promptWithoutVocab).not.toContain('Existing project concept vocabulary');
    expect(promptWithoutVocab).toContain('Sample text about graphs');
  });
});
