export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const createApiResponse = <T = unknown>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
} => ({
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
