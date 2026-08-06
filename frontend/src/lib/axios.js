import axios from "axios";

const axiosInstance = axios.create({
  // fall back to local API if env var is missing to avoid silent undefined baseURL
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
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
