// Centralized security constants for backend and frontend usage
// ESM: always use .js extension for imports

export const CSRF_COOKIE_NAME = 'mh-csrf-token';
export const CSRF_HEADER_NAME = 'x-mh-csrf-token';
export const SESSION_COOKIE_NAME = 'mh-session';
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
