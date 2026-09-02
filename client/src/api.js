import axios from "axios";
import { getAuth } from "firebase/auth";

const configuredApiUrl = process.env.REACT_APP_API_URL;
const apiUrl = configuredApiUrl || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5000' : undefined);

if (!apiUrl) {
  throw new Error('REACT_APP_API_URL must be configured for production builds');
}

const api = axios.create({
  baseURL: apiUrl,
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
