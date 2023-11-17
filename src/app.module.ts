import { Module } from '@nestjs/common';
import { MonumentModule } from './monuments/monuments.module';

@Module({
  imports: [MonumentModule],
})
export class AppModule {}
