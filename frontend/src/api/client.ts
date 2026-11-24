import axios from 'axios';
import { handleMockFallback } from './mockFallback';

const apiBase = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('trevasq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Check if the response is actually an HTML page returned by Vercel's SPA fallback rewrite
    const isHtmlResponse = 
      typeof response.data === 'string' && 
      (response.data.includes('<!DOCTYPE html>') || 
       response.data.includes('<!doctype html>') || 
       response.data.includes('<html') ||
       String(response.headers?.['content-type'] || '').includes('text/html'));

    if (isHtmlResponse && response.config) {
      const url = response.config.url || '';
      const method = response.config.method || 'get';
      let reqData = response.config.data;
      if (typeof reqData === 'string') {
        try { reqData = JSON.parse(reqData); } catch (e) {}
      }
      const fallback = handleMockFallback(url, method, reqData);
      return {
        ...response,
        data: fallback.data,
        status: fallback.status,
        statusText: 'OK (Cloud Fallback)',
      };
    }

    return response;
  },
  (error) => {
    // Check if the backend is missing, returns static 404/405, or fails with a server error in cloud preview
    const isMissingBackend = 
      !error.response || 
      error.response.status === 404 || 
      error.response.status === 405 ||
      error.response.status >= 500;

    if (isMissingBackend && error.config) {
      const url = error.config.url || '';
      const method = error.config.method || 'get';
      let reqData = error.config.data;
      if (typeof reqData === 'string') {
        try { reqData = JSON.parse(reqData); } catch (e) {}
      }
      
      const fallback = handleMockFallback(url, method, reqData);
      return Promise.resolve({
        data: fallback.data,
        status: fallback.status,
        statusText: 'OK (Cloud Fallback)',
        headers: {},
        config: error.config,
      });
    }

    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/inquiry') && !window.location.pathname.startsWith('/unsubscribe')) {
        localStorage.removeItem('trevasq_token');
        localStorage.removeItem('trevasq_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
