/**
 * API Error Types
 *
 * Custom error class for API failures with HTTP status information.
 */

export interface ApiErrorOptions {
  status: number;
  statusText: string;
  message: string;
  data?: unknown;
}

/**
 * Custom error class for API request failures.
 *
 * Extends the native Error class with HTTP status information and optional response data.
 * Use this for all API-related errors to maintain consistent error handling across the app.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly data?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.data = options.data;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Factory method to create an ApiError from a Response object.
   *
   * @param response - The failed Response object
   * @param data - Optional parsed response body
   * @returns A new ApiError instance
   */
  public static fromResponse(response: Response, data?: unknown): ApiError {
    return new ApiError({
      status: response.status,
      statusText: response.statusText,
      message: `API request failed: ${response.status} ${response.statusText}`,
      data,
    });
  }
}

/**
 * Options for API requests, extending standard fetch RequestInit.
 */
export interface ApiRequestOptions extends RequestInit {
  /**
   * Skip automatic authentication header injection.
   * Use this for public endpoints that don't require authentication.
   */
  skipAuth?: boolean;
}
