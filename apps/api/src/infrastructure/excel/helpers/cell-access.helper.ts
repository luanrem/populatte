import * as XLSX from 'xlsx';

import { CellType, type CellTypeMap } from '../types';

/**
 * Type-safe SheetJS cell access helper
 * Handles TypeScript strict mode (noUncheckedIndexedAccess)
 * @see https://docs.sheetjs.com/docs/csf/cell/
 */
export class CellAccessHelper {
  /**
   * Get cell value with strict TypeScript safety
   * Returns null for undefined/empty cells
   *
   * @param sheet - SheetJS worksheet
   * @param address - Cell address (e.g., "A1", "B2")
   * @returns Cell value or null
   */
  public static getCellValue(
    sheet: XLSX.WorkSheet,
    address: string,
  ): string | number | boolean | Date | null {
    // Type assertion for strict mode compatibility
    const cell = (sheet as Record<string, XLSX.CellObject | undefined>)[
      address
    ];

    // Handle undefined cells or empty cells (type 'z')
    if (!cell || cell.t === 'z') {
      return null;
    }

    // Return cached value for formulas, raw value for data
    return cell.v ?? null;
  }

  /**
   * Determine SheetJS cell type from cell object
   * Maps SheetJS cell.t values to CellType enum
   *
   * @param sheet - SheetJS worksheet
   * @param address - Cell address (e.g., "A1", "B2")
   * @returns CellType enum value
   */
  public static getCellType(sheet: XLSX.WorkSheet, address: string): CellType {
    // Type assertion for strict mode compatibility
    const cell = (sheet as Record<string, XLSX.CellObject | undefined>)[
      address
    ];

    // Handle undefined or empty cells
    if (!cell || cell.t === 'z') {
      return CellType.Empty;
    }

    // Map SheetJS cell types to CellType enum
    switch (cell.t) {
      case 's':
        return CellType.String;
      case 'b':
        return CellType.Boolean;
      case 'd':
        return CellType.Date;
      case 'e':
        return CellType.Error;
      case 'n': {
        // Numbers with date format code are dates
        // Use SSF.is_date if available and format code exists
        if (cell.z && typeof XLSX.SSF !== 'undefined') {
          const isDate = XLSX.SSF.is_date(cell.z);
          return isDate ? CellType.Date : CellType.Number;
        }
        return CellType.Number;
      }
      default:
        return CellType.Empty;
    }
  }

  /**
   * Build type map for entire sheet
   * Supports both column mode (ListMode) and cell mode (ProfileMode)
   *
   * @param sheet - SheetJS worksheet
   * @param mode - 'column' for ListMode (maps column letters), 'cell' for ProfileMode (maps cell addresses)
   * @returns Type map
   */
  public static buildTypeMap(
    sheet: XLSX.WorkSheet,
    mode: 'column' | 'cell',
  ): CellTypeMap {
    const typeMap: CellTypeMap = {};

    // Get sheet range, default to A1 if no data
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    // Iterate all cells in the range
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        const type = this.getCellType(sheet, address);

        if (mode === 'cell') {
          // Cell mode: map every cell address
          typeMap[address] = type;
        } else {
          // Column mode: use first non-empty cell type for column
          const colLetter = XLSX.utils.encode_col(C);
          if (!typeMap[colLetter] && type !== CellType.Empty) {
            typeMap[colLetter] = type;
          }
        }
      }
    }

    return typeMap;
  }
}
