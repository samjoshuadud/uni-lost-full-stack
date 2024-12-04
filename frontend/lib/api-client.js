import { API_BASE_URL, API_ENDPOINTS } from './api-config';

// Auth API calls
export const authApi = {
    testProtected: async (token) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.protected}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.json();
    },

    assignAdmin: async (token, email) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.assignAdmin}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        return response.json();
    }
};

// Item API calls
export const itemApi = {
    getAllPending: async (token) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.items.pending.all}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.json();
    },

    getUserPending: async (token, userId) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.items.pending.user(userId)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.json();
    },

    createItem: async (token, formData) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.items.base}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        return response.json();
    },

    deleteItem: async (token, itemId) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.items.byId(itemId)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.ok;
    },

    deletePendingProcess: async (token, processId) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.items.pending.delete(processId)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.ok;
    },

    approveItem: async (token, itemId, data) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.items.approve(itemId)}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return response.json();
    },

    updateProcessStatus: async (token, itemId, status) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.items.process.status(itemId)}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        return response.json();
    },

    submitClaim: async (claimData) => {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.items.claim}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(claimData)
        });
        return response.json();
    }
}; 

