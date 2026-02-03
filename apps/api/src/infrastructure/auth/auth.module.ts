import { Global, Module } from '@nestjs/common';

import { ClerkService } from './clerk.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ExtensionAuthGuard } from './guards/extension-auth.guard';
import { ExtensionAuthService } from './extension-auth.service';

@Global()
@Module({
  providers: [
    ClerkService,
    ClerkAuthGuard,
    ExtensionAuthService,
    ExtensionAuthGuard,
  ],
  exports: [
    ClerkService,
    ClerkAuthGuard,
    ExtensionAuthService,
    ExtensionAuthGuard,
  ],
})
export class AuthModule {}
