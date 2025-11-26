/**
 * Date utility functions following SOLID principles
 */

export class DateUtils {
  /**
   * Checks if a date is in the past
   */
  public static isPast(date: Date): boolean {
    return date.getTime() < Date.now();
  }

  /**
   * Checks if a date is in the future
   */
  public static isFuture(date: Date): boolean {
    return date.getTime() > Date.now();
  }

  /**
   * Adds days to a date
   */
  public static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Formats a date to ISO string without milliseconds
   */
  public static toISOStringWithoutMs(date: Date): string {
    return date.toISOString().split('.')[0] + 'Z';
  }
}
