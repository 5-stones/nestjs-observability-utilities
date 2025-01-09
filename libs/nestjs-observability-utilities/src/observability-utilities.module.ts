import { Module } from '@nestjs/common';
import { OneLineLogger } from './logging';

// we don't really need a module, but I suppose we could set up the logger
@Module({
  providers: [OneLineLogger],
  exports: [OneLineLogger],
})
export class ObservabilityUtilitiesModule {}
