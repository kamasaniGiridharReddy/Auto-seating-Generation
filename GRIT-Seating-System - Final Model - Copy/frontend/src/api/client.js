/** HTTP client for Flask API. TODO: implement interceptors and auth headers. */

import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// TODO: request/response interceptors for auth tokens
