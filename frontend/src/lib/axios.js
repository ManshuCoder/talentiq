import axios from "axios";

// Ensure baseURL ends with /api for consistency
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const cleanBaseUrl = baseUrl.replace(/\/api\/?$/, ''); // Remove trailing /api if present
const axiosInstance = axios.create({
  baseURL: cleanBaseUrl + '/api',
  withCredentials: true, // by adding this field browser will send the cookies to server automatically, on every single req
});

axiosInstance.interceptors.request.use(async (config) => {
  try {
    const token = await window.Clerk?.session?.getToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Unable to attach Clerk token", error);
  }

  return config;
});

export default axiosInstance;
