/**
 * Helper utilities for E2E tests.
 */

export type RandomTestUser = {
  email: string;
  password: string;
  fullName: string;
};

export function generateRandomTestUser(): RandomTestUser {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  return {
    email: `testuser_${timestamp}_${randomSuffix}@example.com`,
    password: `Pass_${timestamp}_${randomSuffix}!`,
    fullName: `Test User ${randomSuffix}`,
  };
}
