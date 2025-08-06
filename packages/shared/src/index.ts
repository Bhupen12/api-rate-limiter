export * from './types';
export * from './utils';
export * from './config';
export * from './clients';
export * from './services';

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const createApiResponse = <T = any>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): any => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString(),
});

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
