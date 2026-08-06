import axios from "axios";

const axiosInstance = axios.create({
  // fall back to local API if env var is missing to avoid silent undefined baseURL
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true, // send cookies for Clerk auth
});

export default axiosInstance;
