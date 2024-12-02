// API base URL
// const API_BASE_URL = "http://localhost:5067"; // TODO: Change to ngrok URL
const API_BASE_URL = "https://2e92-136-158-1-190.ngrok-free.app";
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
            status: (itemId) => `/api/Item/process/${itemId}/status`
        }
    }
};

export { API_BASE_URL, API_ENDPOINTS }; 
