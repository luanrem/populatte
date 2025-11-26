/**
 * Validation utility functions following SOLID principles
 */

export class ValidationUtils {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly URL_REGEX = /^https?:\/\/.+/;

  /**
   * Validates an email address
   */
  public static isValidEmail(email: string): boolean {
    return this.EMAIL_REGEX.test(email);
  }

  /**
   * Validates a URL
   */
  public static isValidUrl(url: string): boolean {
    return this.URL_REGEX.test(url);
  }

  /**
   * Checks if a string is empty or contains only whitespace
   */
  public static isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
  }

  /**
   * Checks if a value is not null and not undefined
   */
  public static isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }
}
