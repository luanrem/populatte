import { Injectable } from '@nestjs/common';

import { InferredType, TypeInference } from '../entities/field-stats.entity';

@Injectable()
export class TypeInferenceService {
  private static readonly BOOLEAN_VALUES = new Set([
    'true',
    'false',
    'yes',
    'no',
    'sim',
    'não',
    'nao',
    's',
    'n',
  ]);

  private static readonly BOOLEAN_NUMERIC = new Set(['1', '0']);

  // Brazilian ID patterns
  private static readonly CPF_PATTERN = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
  private static readonly CNPJ_PATTERN =
    /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
  private static readonly CEP_PATTERN = /^\d{5}-?\d{3}$/;

  // Brazilian date pattern: DD/MM/YYYY or DD-MM-YYYY
  private static readonly BRAZILIAN_DATE_PATTERN = /^\d{2}[/-]\d{2}[/-]\d{4}$/;

  // Brazilian currency pattern: R$ 1.234,56 or R$1.234,56
  private static readonly BRAZILIAN_CURRENCY_PATTERN =
    /^R\$\s?\d{1,3}(\.\d{3})*(,\d{2})?$/;

  public inferType(samples: unknown[]): TypeInference {
    // Filter out null, undefined, and empty strings (including whitespace-only)
    const nonEmptySamples = samples.filter((sample) => {
      if (sample === null || sample === undefined) {
        return false;
      }
      if (typeof sample === 'string' && sample.trim() === '') {
        return false;
      }
      return true;
    });

    // If all filtered out, return UNKNOWN
    if (nonEmptySamples.length === 0) {
      return {
        type: InferredType.UNKNOWN,
        confidence: 0,
      };
    }

    // Special case: Check if ALL values are strictly "1" or "0" (boolean numeric pattern)
    const allBooleanNumeric = nonEmptySamples.every((sample) => {
      const strValue = String(sample);
      return TypeInferenceService.BOOLEAN_NUMERIC.has(strValue);
    });

    if (allBooleanNumeric) {
      return {
        type: InferredType.BOOLEAN,
        confidence: 1.0,
      };
    }

    // Count occurrences of each type
    const typeCounts = new Map<InferredType, number>();

    for (const sample of nonEmptySamples) {
      const detectedType = this.detectSingleType(sample);
      typeCounts.set(detectedType, (typeCounts.get(detectedType) ?? 0) + 1);
    }

    // Find dominant type (highest count)
    let dominantType = InferredType.UNKNOWN;
    let maxCount = 0;

    for (const [type, count] of typeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    // Calculate confidence
    const confidence = maxCount / nonEmptySamples.length;

    // Apply threshold fallback logic:
    // If no type reaches 80% threshold, fall back to STRING with 1.0 confidence
    // This handles mixed type columns where no single type is dominant enough
    if (confidence < 0.8) {
      return {
        type: InferredType.STRING,
        confidence: 1.0,
      };
    }

    // If dominant type reaches >= 80%, return it with actual confidence
    return {
      type: dominantType,
      confidence,
    };
  }

  private detectSingleType(value: unknown): InferredType {
    // Handle native boolean type
    if (typeof value === 'boolean') {
      return InferredType.BOOLEAN;
    }

    // Handle native number type
    if (typeof value === 'number' && !isNaN(value)) {
      return InferredType.NUMBER;
    }

    // Handle native Date type
    if (value instanceof Date && !isNaN(value.getTime())) {
      return InferredType.DATE;
    }

    // For non-string types that don't match above, convert to string for pattern matching
    const strValue = String(value);

    // 1. STRING (Brazilian IDs) — CPF, CNPJ, CEP
    // Check these BEFORE number detection to prevent '12345678901' being treated as number
    if (
      TypeInferenceService.CPF_PATTERN.test(strValue) ||
      TypeInferenceService.CNPJ_PATTERN.test(strValue) ||
      TypeInferenceService.CEP_PATTERN.test(strValue)
    ) {
      return InferredType.STRING;
    }

    // 2. DATE (Brazilian) — DD/MM/YYYY or DD-MM-YYYY
    // IMPORTANT: Check this BEFORE general Date.parse to prevent MM/DD/YYYY misinterpretation
    if (TypeInferenceService.BRAZILIAN_DATE_PATTERN.test(strValue)) {
      return InferredType.DATE;
    }

    // 3. NUMBER (Brazilian currency) — R$ format
    if (TypeInferenceService.BRAZILIAN_CURRENCY_PATTERN.test(strValue)) {
      return InferredType.NUMBER;
    }

    // 4. NUMBER — pure numeric
    // Check this BEFORE boolean to allow "1", "2.5", "3" to be detected as numbers
    if (!isNaN(Number(strValue)) && strValue.trim() !== '') {
      return InferredType.NUMBER;
    }

    // 5. DATE — ISO or common formats via Date.parse
    const parsedDate = Date.parse(strValue);
    if (!isNaN(parsedDate)) {
      return InferredType.DATE;
    }

    // 6. BOOLEAN — strict keyword set (case-insensitive)
    // Check this AFTER number detection so "1" and "0" are treated as numbers when mixed with other numbers
    // But the majority-wins heuristic will still detect ['1', '0', '1', '0'] as BOOLEAN
    if (TypeInferenceService.BOOLEAN_VALUES.has(strValue.toLowerCase())) {
      return InferredType.BOOLEAN;
    }

    // 7. STRING — default fallback
    return InferredType.STRING;
  }
}
