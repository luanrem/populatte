import type { ParseResult } from '../types';

/**
 * File input structure for parsing strategies
 * Contains buffer and original filename for traceability
 */
export interface ExcelFileInput {
  buffer: Buffer;
  originalName: string;
}

/**
 * Strategy interface for Excel file parsing
 * Implementations: ListModeStrategy, ProfileModeStrategy
 *
 * @see ListModeStrategy - Header-based parsing (single file, multiple sheets)
 * @see ProfileModeStrategy - Cell-address parsing (multiple files)
 */
export interface ExcelParsingStrategy {
  /**
   * Parse Excel files into normalized ParsedRow array
   *
   * @param files - Array of file buffers with original filenames
   * @returns Parse result with rows and type map
   * @throws Error if file is unparseable or validation fails
   */
  parse(files: ExcelFileInput[]): ParseResult;

  /**
   * Validate file count for this strategy
   * - ListMode: exactly 1 file
   * - ProfileMode: 1-N files
   *
   * @param count - Number of files uploaded
   * @throws Error if file count is invalid for this strategy
   */
  validateFileCount(count: number): void;
}
