import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://api.busnotify.me",
});

// Request interceptor to add JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token first
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const refreshResponse = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/refresh`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (refreshResponse.data.token) {
            localStorage.setItem('token', refreshResponse.data.token);
            // Retry the original request
            error.config.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
            return axiosInstance(error.config);
          }
        } catch (refreshError) {
          console.log('Token refresh failed, redirecting to login');
        }
      }

      // If refresh fails or no token, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      window.location.href = '/student-login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
