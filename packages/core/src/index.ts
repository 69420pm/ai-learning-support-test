export * from '@ai-learning-support/infrastructure';
export * from '@ai-learning-support/shared';
export * from './factory.js';
export * from './services/document/document-service.js';

// Preserve existing exports to keep the integration tests green
export const core = () => 'core';
