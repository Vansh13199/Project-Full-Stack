const API_BASE_URL = `http://${window.location.hostname}:3000/api`;

export async function apiCall(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = { message: 'Bad response from server' };
        }

        if (!response.ok) {
            throw new Error(data.message || 'An error occurred');
        }

        return data;
    } catch (error) {
        if (error.message === 'Failed to fetch') {
            throw new Error('Could not connect to server. Is it running?');
        }
        throw error;
    }
}
