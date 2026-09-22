import { Module } from '@nestjs/common';

import { AdminAuthGuard } from './admin-auth.guard';

@Module({
  providers: [AdminAuthGuard],
  exports: [AdminAuthGuard],
})
export class AuthModule {}