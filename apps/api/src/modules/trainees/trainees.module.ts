import { Module } from '@nestjs/common';
import { TraineesService } from './trainees.service';
import { TraineesController } from './trainees.controller';

@Module({
  controllers: [TraineesController],
  providers: [TraineesService],
  exports: [TraineesService],
})
export class TraineesModule {}
