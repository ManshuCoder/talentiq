import axios from "axios";

const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  if (!url.endsWith('/api') && !url.endsWith('/api/')) {
    url = url.replace(/\/$/, '') + '/api';
  }
  return url;
};

const axiosInstance = axios.create({
  // use the normalized base URL to prevent 404s
  baseURL: getBaseUrl(),
  withCredentials: true, // send cookies for Clerk auth (fallback)
});

// Intercept requests to inject the Clerk Bearer token for cross-domain authentication
axiosInstance.interceptors.request.use(async (config) => {
  try {
    if (window.Clerk?.session) {
      const token = await window.Clerk.session.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.error("Error fetching Clerk token:", error);
  }
  return config;
});

export default axiosInstance;
