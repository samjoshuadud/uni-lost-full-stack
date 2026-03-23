// API base URL
//
// In production the API must be reached over HTTPS to avoid ERR_SSL_PROTOCOL_ERROR
// (browsers enforce HSTS for *.azurewebsites.net and similar domains).
// If NEXT_PUBLIC_API_URL is accidentally set to an http:// URL we silently upgrade
// it to https:// when the app is running in production mode.
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE_URL =
  process.env.NODE_ENV === 'production' && rawApiUrl.startsWith('http://')
    ? rawApiUrl.replace('http://', 'https://')
    : rawApiUrl;
// const API_BASE_URL = "https://2e92-136-158-1-190.ngrok-free.app";
// API endpoints configuration
const API_ENDPOINTS = {
    auth: {
        protected: '/api/Auth/protected',
        assignAdmin: '/api/Auth/assign-admin'
    },
    items: {
        base: '/api/Item',
        byId: (id) => `/api/Item/${id}`,
        pending: {
            user: (userId) => `/api/Item/pending/user/${userId}`,
            all: '/api/Item/pending/all',
            delete: (processId) => `/api/Item/pending/${processId}`
        },
        approve: (id) => `/api/Item/${id}/approve`,
        process: {
            status: (itemId) => `/api/Item/process/${itemId}/status`,
            cancelClaim: (processId) => `/api/Item/process/${processId}/cancel-claim`
        },
        claim: '/api/Item/process/claim'
    }
};

export { API_BASE_URL, API_ENDPOINTS }; 
