import { Global, Module } from '@nestjs/common';

import { ClerkService } from './clerk.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ExtensionAuthService } from './extension-auth.service';

@Global()
@Module({
  providers: [ClerkService, ClerkAuthGuard, ExtensionAuthService],
  exports: [ClerkService, ClerkAuthGuard, ExtensionAuthService],
})
export class AuthModule {}
