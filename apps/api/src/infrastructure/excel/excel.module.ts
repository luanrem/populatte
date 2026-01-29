import { Module } from '@nestjs/common';

import { LIST_MODE_STRATEGY, PROFILE_MODE_STRATEGY } from './excel.constants';
import { ListModeStrategy } from './strategies/list-mode.strategy';
import { ProfileModeStrategy } from './strategies/profile-mode.strategy';

/**
 * Excel parsing module
 * Provides strategy-based Excel file parsing
 *
 * Exports:
 * - LIST_MODE_STRATEGY: Header-based parsing for single files
 * - PROFILE_MODE_STRATEGY: Cell-address parsing for multiple files
 *
 * Usage:
 * @Inject(LIST_MODE_STRATEGY) private listStrategy: ExcelParsingStrategy
 */
@Module({
  providers: [
    {
      provide: LIST_MODE_STRATEGY,
      useClass: ListModeStrategy,
    },
    {
      provide: PROFILE_MODE_STRATEGY,
      useClass: ProfileModeStrategy,
    },
  ],
  exports: [LIST_MODE_STRATEGY, PROFILE_MODE_STRATEGY],
})
export class ExcelModule {}
