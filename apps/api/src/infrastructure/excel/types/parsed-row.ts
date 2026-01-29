import type { CellType } from './cell-type-map';

/**
 * Normalized row data structure returned by Excel parsing strategies
 * Used by both ListMode and ProfileMode strategies
 */
export interface ParsedRow {
  /**
   * Original spreadsheet row number (1-indexed)
   * For traceability back to Excel source
   */
  rowIndex: number;

  /**
   * Sheet name this row came from
   * Enables differentiation when workbooks have multiple sheets
   */
  sheetName: string;

  /**
   * Original file name for traceability
   * Essential when multiple files are parsed in ProfileMode
   */
  sourceFileName: string;

  /**
   * JSONB payload containing cell data
   * - ListMode: keys are normalized header names from first row
   * - ProfileMode: keys are cell addresses (A1, B2, etc.)
   */
  data: Record<string, unknown>;
}

/**
 * Complete parse result from a strategy
 * Contains all rows plus the type map for the batch
 */
export interface ParseResult {
  /**
   * All parsed rows from the file(s)
   */
  rows: ParsedRow[];

  /**
   * Type map for the batch
   * - ListMode: maps column letters to types
   * - ProfileMode: maps cell addresses to types
   */
  typeMap: Record<string, CellType>;
}
