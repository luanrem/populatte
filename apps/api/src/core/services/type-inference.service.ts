import { Injectable } from '@nestjs/common';

import { InferredType, TypeInference } from '../entities/field-stats.entity';

@Injectable()
export class TypeInferenceService {
  public inferType(samples: unknown[]): TypeInference {
    // Stub implementation - tests will fail
    return {
      type: InferredType.UNKNOWN,
      confidence: 0,
    };
  }
}
