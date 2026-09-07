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
});
