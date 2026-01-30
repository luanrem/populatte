import { Test, TestingModule } from '@nestjs/testing';

import { InferredType } from '../entities/field-stats.entity';
import { TypeInferenceService } from './type-inference.service';

describe('TypeInferenceService', () => {
  let service: TypeInferenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TypeInferenceService],
    }).compile();

    service = module.get<TypeInferenceService>(TypeInferenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('STRING detection', () => {
    it('should detect STRING with 100% confidence for text values', () => {
      const result = service.inferType(['hello', 'world', 'foo']);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect STRING and filter out empty/null values', () => {
      const result = service.inferType(['abc', 'def', '', null]);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should classify CPF as STRING', () => {
      const result = service.inferType(['123.456.789-01', '987.654.321-00']);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should classify CNPJ as STRING', () => {
      const result = service.inferType([
        '12.345.678/0001-90',
        '98.765.432/0001-01',
      ]);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should classify CEP as STRING', () => {
      const result = service.inferType(['01234-567', '98765-432']);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should classify unformatted CPF as STRING', () => {
      const result = service.inferType(['12345678901', '98765432100']);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should classify unformatted CNPJ as STRING', () => {
      const result = service.inferType([
        '12345678000190',
        '98765432000101',
      ]);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should classify unformatted CEP as STRING', () => {
      const result = service.inferType(['01234567', '98765432']);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('NUMBER detection', () => {
    it('should detect NUMBER with 100% confidence for numeric values', () => {
      const result = service.inferType(['1', '2.5', '3', '-4', '5']);
      expect(result.type).toBe(InferredType.NUMBER);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect NUMBER from Brazilian currency format', () => {
      const result = service.inferType([
        'R$ 1.234,56',
        'R$ 99,00',
        'R$ 0,50',
      ]);
      expect(result.type).toBe(InferredType.NUMBER);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect NUMBER from Brazilian currency without space', () => {
      const result = service.inferType(['R$1.234,56', 'R$99,00', 'R$0,50']);
      expect(result.type).toBe(InferredType.NUMBER);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect NUMBER with >=80% confidence for majority numeric', () => {
      const result = service.inferType(['hello', '1', '2', '3', '4']);
      expect(result.type).toBe(InferredType.NUMBER);
      expect(result.confidence).toBe(0.8);
    });
  });

  describe('DATE detection', () => {
    it('should detect DATE from Brazilian DD/MM/YYYY format', () => {
      const result = service.inferType([
        '25/01/2026',
        '30/12/2025',
        '01/06/2024',
      ]);
      expect(result.type).toBe(InferredType.DATE);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect DATE from Brazilian DD-MM-YYYY format', () => {
      const result = service.inferType([
        '25-01-2026',
        '30-12-2025',
        '01-06-2024',
      ]);
      expect(result.type).toBe(InferredType.DATE);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect DATE from ISO format', () => {
      const result = service.inferType(['2026-01-25', '2025-12-30']);
      expect(result.type).toBe(InferredType.DATE);
      expect(result.confidence).toBe(1.0);
    });

    it('should NOT misinterpret Brazilian date as American MM/DD/YYYY', () => {
      // 13/01/2026 is invalid as MM/DD/YYYY (month 13 doesn't exist)
      // But valid as DD/MM/YYYY (13th of January)
      const result = service.inferType(['13/01/2026', '25/12/2025']);
      expect(result.type).toBe(InferredType.DATE);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('BOOLEAN detection', () => {
    it('should detect BOOLEAN from sim/nao keywords', () => {
      const result = service.inferType(['sim', 'nao', 'sim', 'sim']);
      expect(result.type).toBe(InferredType.BOOLEAN);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect BOOLEAN from true/false keywords', () => {
      const result = service.inferType(['true', 'false', 'true']);
      expect(result.type).toBe(InferredType.BOOLEAN);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect BOOLEAN from S/N single-letter keywords', () => {
      const result = service.inferType(['S', 'N', 'S', 'N', 'S']);
      expect(result.type).toBe(InferredType.BOOLEAN);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect BOOLEAN from 0/1 numeric representation', () => {
      const result = service.inferType(['1', '0', '1', '0']);
      expect(result.type).toBe(InferredType.BOOLEAN);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect BOOLEAN case-insensitively', () => {
      const result = service.inferType(['TRUE', 'False', 'SIM', 'Nao']);
      expect(result.type).toBe(InferredType.BOOLEAN);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect BOOLEAN from yes/no keywords', () => {
      const result = service.inferType(['yes', 'no', 'yes']);
      expect(result.type).toBe(InferredType.BOOLEAN);
      expect(result.confidence).toBe(1.0);
    });

    it('should detect BOOLEAN from "não" with accent', () => {
      const result = service.inferType(['sim', 'não', 'sim']);
      expect(result.type).toBe(InferredType.BOOLEAN);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('UNKNOWN detection', () => {
    it('should return UNKNOWN with 0 confidence for empty array', () => {
      const result = service.inferType([]);
      expect(result.type).toBe(InferredType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });

    it('should return UNKNOWN with 0 confidence for all null/empty', () => {
      const result = service.inferType([null, '', undefined]);
      expect(result.type).toBe(InferredType.UNKNOWN);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Mixed types / threshold fallback', () => {
    it('should fall back to STRING when NUMBER confidence < 80%', () => {
      // 3 numbers out of 5 = 60% < 80%
      const result = service.inferType(['hello', 'world', '1', '2', '3']);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should fall back to STRING when DATE confidence < 80%', () => {
      // 2 dates out of 5 = 40% < 80%
      const result = service.inferType([
        'hello',
        'world',
        'foo',
        '25/01/2026',
        '30/12/2025',
      ]);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should NOT fall back when STRING is already dominant', () => {
      // 4 strings out of 5 = 80% (STRING doesn't need threshold)
      const result = service.inferType(['hello', 'world', 'foo', 'bar', '1']);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(0.8);
    });

    it('should detect BOOLEAN even with some mixed values if >= 80%', () => {
      // 4 booleans out of 5 = 80%
      const result = service.inferType(['sim', 'nao', 'sim', 'sim', 'other']);
      expect(result.type).toBe(InferredType.BOOLEAN);
      expect(result.confidence).toBe(0.8);
    });
  });

  describe('Edge cases', () => {
    it('should handle numeric values as numbers, not strings', () => {
      const result = service.inferType([1, 2, 3, 4, 5]);
      expect(result.type).toBe(InferredType.NUMBER);
      expect(result.confidence).toBe(1.0);
    });

    it('should handle boolean values as booleans', () => {
      const result = service.inferType([true, false, true, false]);
      expect(result.type).toBe(InferredType.BOOLEAN);
      expect(result.confidence).toBe(1.0);
    });

    it('should handle Date objects as dates', () => {
      const result = service.inferType([
        new Date('2026-01-25'),
        new Date('2025-12-30'),
      ]);
      expect(result.type).toBe(InferredType.DATE);
      expect(result.confidence).toBe(1.0);
    });

    it('should filter out undefined values', () => {
      const result = service.inferType(['hello', undefined, 'world']);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });

    it('should handle whitespace-only strings as empty', () => {
      const result = service.inferType(['hello', '   ', 'world']);
      expect(result.type).toBe(InferredType.STRING);
      expect(result.confidence).toBe(1.0);
    });
  });
});
