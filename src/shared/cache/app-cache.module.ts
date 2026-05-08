import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';

@Global()
@Module({
  imports: [
    CacheModule.register({
      max: 1000,
    }),
  ],
  exports: [CacheModule],
})
export class AppCacheModule {}
