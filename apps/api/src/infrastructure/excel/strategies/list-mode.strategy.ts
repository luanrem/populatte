import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

import { CellAccessHelper } from '../helpers/cell-access.helper';
import type { CellTypeMap, ParsedRow, ParseResult } from '../types';

import type {
  ExcelFileInput,
  ExcelParsingStrategy,
} from './excel-parsing.strategy';

/**
 * ListMode Excel parsing strategy
 * Parses a single file with header row into N rows with header-based keys
 *
 * @example
 * // Excel file with headers: Name, Email, Age
 * // Row 2: "John", "john@example.com", 30
 * // Parses to: { Name: "John", Email: "john@example.com", Age: 30 }
 */
@Injectable()
export class ListModeStrategy implements ExcelParsingStrategy {
  /**
   * Validate file count for ListMode
   * ListMode requires exactly 1 file
   *
   * @param count - Number of files uploaded
   * @throws Error if count is not 1
   */
  public validateFileCount(count: number): void {
    if (count !== 1) {
      throw new Error('List mode requires exactly 1 file');
    }
  }

  /**
   * Parse single Excel file into rows with header-based keys
   * Handles multiple sheets with potentially different headers
   *
   * @param files - Single-element array with Excel file buffer
   * @returns ParseResult with rows and column type map
   * @throws Error if file is unparseable or has no data rows
   */
  public parse(files: ExcelFileInput[]): ParseResult {
    this.validateFileCount(files.length);

    // Extract single file (validated above)
    const file = files[0];

    // Parse workbook with date normalization
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: true,
    });

    const allRows: ParsedRow[] = [];
    const mergedTypeMap: CellTypeMap = {};

    // Process all sheets in workbook
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        continue;
      }

      // Convert sheet to JSON using first row as headers
      const jsonRows = XLSX.utils.sheet_to_json(sheet, {
        defval: null, // Empty cells become null (not omitted)
        raw: false, // Use formatted strings (preserves date display format)
        blankrows: false, // Skip completely empty rows
      });

      // Skip sheets with no data rows (header only)
      if (jsonRows.length === 0) {
        continue;
      }

      // Build type map for this sheet
      const sheetTypeMap = CellAccessHelper.buildTypeMap(sheet, 'column');

      // Merge sheet type map into global type map
      Object.assign(mergedTypeMap, sheetTypeMap);

      // Transform JSON rows into ParsedRow format
      for (let i = 0; i < jsonRows.length; i++) {
        const row = jsonRows[i] as Record<string, unknown>;

        // Normalize undefined values to null
        const normalizedData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          normalizedData[key] = value === undefined ? null : value;
        }

        allRows.push({
          rowIndex: i + 2, // Skip header row (row 1), 1-indexed Excel rows
          sheetName,
          sourceFileName: file.originalName,
          data: normalizedData,
        });
      }
    }

    // Validate at least one row was parsed
    if (allRows.length === 0) {
      throw new Error('No data rows found in any sheet');
    }

    return {
      rows: allRows,
      typeMap: mergedTypeMap,
    };
  }
}
