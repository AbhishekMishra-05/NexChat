import axios from 'axios';

// Create an axios instance with the base URL of our Spring Boot server
const api = axios.create({
  baseURL: 'http://localhost:8081',
});

// This interceptor runs before every request is sent
// It reads the JWT token from localStorage and adds it to the header
// So every API call is automatically authenticated
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Spring Security reads this header in JwtAuthFilter
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;