import type { LanguageModel } from 'ai';
import { setMockEmbeddingModel } from '@/lib/ai/embedding';
import { createMockEmbeddingModel, createMockLanguageModel } from '@/lib/ai/models.mock';
import { setMockLanguageModel } from '@/lib/ai/providers';

export { createMockEmbeddingModel, createMockLanguageModel };

export const STANDARD_MOCK_CONCEPTS = [
  {
    name: 'Vector Spaces',
    pacerCategory: 'conceptual' as const,
    bloomLevel: 3,
    aliases: ['Linear Spaces'],
  },
  {
    name: 'Linear Transformations',
    pacerCategory: 'procedural' as const,
    bloomLevel: 4,
    aliases: ['Linear Maps'],
  },
  {
    name: 'Eigenvalues and Eigenvectors',
    pacerCategory: 'conceptual' as const,
    bloomLevel: 4,
    aliases: ['Characteristic Vectors'],
  },
];

export const STANDARD_MOCK_PREREQUISITES = [
  {
    sourceName: 'Vector Spaces',
    targetName: 'Linear Transformations',
    relationshipType: 'prerequisite',
    reasoning: 'Understanding vector spaces is necessary before defining mappings between them',
  },
  {
    sourceName: 'Linear Transformations',
    targetName: 'Eigenvalues and Eigenvectors',
    relationshipType: 'prerequisite',
    reasoning:
      'Eigenvectors are specific vectors whose directions are invariant under a linear transformation',
  },
];

export const STANDARD_MOCK_EXERCISES = [
  {
    pageNumber: 1,
    title: 'Axioms Check',
    prompt: 'State the eight axioms that define a vector space over a field.',
    solution:
      'Associativity, commutativity of addition, identity element of addition, inverse elements of addition, compatibility of scalar multiplication, identity element of scalar multiplication, distributivity with respect to vector addition, distributivity with respect to field addition.',
    questionType: 'conceptual' as const,
    difficulty: 2,
    targetConceptName: 'Vector Spaces',
  },
];

export function createConceptExtractionMockAI(overrides?: {
  concepts?: typeof STANDARD_MOCK_CONCEPTS;
  prerequisites?: typeof STANDARD_MOCK_PREREQUISITES;
  exercises?: typeof STANDARD_MOCK_EXERCISES;
}): LanguageModel {
  return createMockLanguageModel({
    objectResponse: {
      concepts: overrides?.concepts ?? STANDARD_MOCK_CONCEPTS,
      prerequisites: overrides?.prerequisites ?? STANDARD_MOCK_PREREQUISITES,
      exercises: overrides?.exercises ?? STANDARD_MOCK_EXERCISES,
    },
  });
}

export function createChatQuestionAnsweringMockAI(options?: {
  toolCallQuery?: string;
  answerText?: string;
}): LanguageModel {
  const query = options?.toolCallQuery ?? 'What are eigenvalues?';
  const answer =
    options?.answerText ??
    'An eigenvalue $\\lambda$ satisfies $A\\mathbf{v} = \\lambda\\mathbf{v}$ for non-zero eigenvector $\\mathbf{v}$. Grounded in course lecture notes.';

  return createMockLanguageModel({
    textResponse: answer,
    toolCalls: [
      {
        toolCallId: 'call-qa-1',
        toolName: 'searchProjectMaterials',
        args: { query },
      },
    ],
  });
}

export function createErrorMockAI(
  errorType: 'rate-limit' | 'timeout' | 'model-overloaded',
): LanguageModel {
  const errorMap = {
    'rate-limit': new Error(
      '429 Too Many Requests: Resource has been exhausted (e.g. check quota)',
    ),
    timeout: new Error(
      '504 Gateway Timeout: AI upstream service failed to respond within deadline',
    ),
    'model-overloaded': new Error('503 Service Unavailable: High traffic, model capacity reached'),
  };

  return createMockLanguageModel({
    simulateError: errorMap[errorType],
  });
}

export function resetMockAIOverrides(): void {
  setMockLanguageModel(null);
  setMockEmbeddingModel(null);
}
