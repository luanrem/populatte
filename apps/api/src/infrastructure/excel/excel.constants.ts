/**
 * Symbol-based DI tokens for Excel parsing strategies
 * Prevents naming collisions and silent provider overwrites
 *
 * @see ExcelParsingStrategy interface
 * @see ListModeStrategy implementation
 * @see ProfileModeStrategy implementation
 */

/**
 * DI token for ListMode parsing strategy
 * Single file, header-based parsing
 */
export const LIST_MODE_STRATEGY = Symbol('LIST_MODE_STRATEGY');

/**
 * DI token for ProfileMode parsing strategy
 * Multiple files, cell-address parsing
 */
export const PROFILE_MODE_STRATEGY = Symbol('PROFILE_MODE_STRATEGY');
