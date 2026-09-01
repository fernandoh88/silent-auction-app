import axios from "axios";
import { getAuth } from "firebase/auth";

const apiUrl = process.env.REACT_APP_API_URL;

if (process.env.NODE_ENV === 'production' && !apiUrl) {
  throw new Error('REACT_APP_API_URL must be configured for production builds');
}

const api = axios.create({
  baseURL: apiUrl || 'http://localhost:5000',
});

// Inject Firebase token
api.interceptors.request.use(async (config) => {
  const auth = getAuth();
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
