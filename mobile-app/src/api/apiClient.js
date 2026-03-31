import axios from 'axios';

// Configure this to match your backend URL
const API_URL = 'https://api.kinesis.sayantan.space/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
