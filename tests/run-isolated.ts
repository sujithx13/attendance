// Set isolation before importing application configuration or any test modules.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
await import('./run-all-tests.js');
export {};
