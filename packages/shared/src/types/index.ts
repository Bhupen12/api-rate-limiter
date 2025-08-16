export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface ServiceConfig {
  name: string;
  url: string;
  timeout: number;
  retries: number;
}

// common types
export * from './common';

// DTOs
export * from './dto/auth.dto';
export * from './dto/user.dto';
