import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

/**
 * @Global() hace que EncryptionService esté disponible en todo el árbol de módulos
 * sin necesidad de importar EncryptionModule en cada módulo que lo use.
 * Similar al patrón de ConfigModule.forRoot({ isGlobal: true }).
 */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}

// Daniel Useche
