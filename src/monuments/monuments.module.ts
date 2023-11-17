import { Module } from '@nestjs/common';
import { MonumentController } from './monuments.controller';
import { MonumentService } from './monuments.service';

@Module({
  controllers: [MonumentController],
  providers: [MonumentService],
})
export class MonumentModule {}
