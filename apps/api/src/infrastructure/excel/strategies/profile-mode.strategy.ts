import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

import { CellAccessHelper } from '../helpers/cell-access.helper';
import type { CellTypeMap, ParsedRow, ParseResult } from '../types';

import type {
  ExcelFileInput,
  ExcelParsingStrategy,
} from './excel-parsing.strategy';

/**
 * ProfileMode Excel parsing strategy
 * Parses N files with cell-address keys (A1, B2) into N rows
 *
 * @example
 * // Excel file with:
 * // A1: "John", B1: "john@example.com", A2: 30
 * // Parses to: { A1: "John", B1: "john@example.com", A2: 30 }
 */
@Injectable()
export class ProfileModeStrategy implements ExcelParsingStrategy {
  /**
   * Validate file count for ProfileMode
   * ProfileMode requires at least 1 file
   *
   * @param count - Number of files uploaded
   * @throws Error if count is less than 1
   */
  public validateFileCount(count: number): void {
    if (count < 1) {
      throw new Error('Profile mode requires at least 1 file');
    }
  }

  /**
   * Parse N Excel files into rows with cell-address keys
   * Each sheet in each file becomes one ParsedRow
   *
   * @param files - Array of Excel file buffers (1 or more)
   * @returns ParseResult with rows and cell type map
   * @throws Error if files are unparseable
   */
  public parse(files: ExcelFileInput[]): ParseResult {
    this.validateFileCount(files.length);

    const allRows: ParsedRow[] = [];
    const mergedTypeMap: CellTypeMap = {};

    // Process each file
    for (const file of files) {
      // Parse workbook with date normalization
      const workbook = XLSX.read(file.buffer, {
        type: 'buffer',
        cellDates: true,
        cellNF: true,
      });

      // Process each sheet in the workbook
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          continue;
        }

        // Get cell range
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

        // Build data object with cell-address keys
        const data: Record<string, unknown> = {};

        // Iterate all cells in range
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            const value = CellAccessHelper.getCellValue(sheet, address);

            // Normalize undefined to null
            data[address] = value === undefined ? null : value;
          }
        }

        // Build type map for this sheet
        const sheetTypeMap = CellAccessHelper.buildTypeMap(sheet, 'cell');

        // Merge sheet type map into global type map
        Object.assign(mergedTypeMap, sheetTypeMap);

        // Create ParsedRow for this sheet
        allRows.push({
          rowIndex: 1, // Profile mode: single logical row per sheet
          sheetName,
          sourceFileName: file.originalName,
          data,
        });
      }
    }

    return {
      rows: allRows,
      typeMap: mergedTypeMap,
    };
  }
}
