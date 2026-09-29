import { Module } from '@nestjs/common';
import { CounsellingService } from './counselling.service';
import { CounsellingController } from './counselling.controller';

@Module({
  controllers: [CounsellingController],
  providers: [CounsellingService],
  exports: [CounsellingService],
})
export class CounsellingModule {}
