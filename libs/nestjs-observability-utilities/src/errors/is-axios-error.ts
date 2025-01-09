/** Simplified isAxiosError for error handling without peer dependencies. */
export function isAxiosError(err: unknown): err is {
  isAxiosError: true;
  code?: number | string;
  config: {
    method: string;
    url: string;
  };
  response?: {
    status?: number;
    data?: unknown;
  };
  message: string;
} {
  if (err && typeof err === 'object') {
    return 'isAxiosError' in err && err.isAxiosError === true;
  }
  return false;
}
