import { Module } from '@nestjs/common';
import { EmploymentService } from './employment.service';
import { EmploymentController } from './employment.controller';
import { JobsController } from './jobs.controller';
import { EmployersController } from './employers.controller';

@Module({
  controllers: [EmploymentController, JobsController, EmployersController],
  providers: [EmploymentService],
  exports: [EmploymentService],
})
export class EmploymentModule {}
