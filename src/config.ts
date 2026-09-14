// Backend (NestJS) runs on port 4500 by default. Use VITE_API_URL to override.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4500';
