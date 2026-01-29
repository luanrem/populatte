/**
 * SheetJS cell type enumeration
 * Maps to SheetJS cell.t property values
 * @see https://docs.sheetjs.com/docs/csf/cell/
 */
export enum CellType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Date = 'date',
  Error = 'error',
  Empty = 'empty',
}

/**
 * Type map from column/cell identifier to CellType
 * - ListMode: keys are column letters (A, B, C, ...)
 * - ProfileMode: keys are cell addresses (A1, B2, ...)
 */
export type CellTypeMap = Record<string, CellType>;
