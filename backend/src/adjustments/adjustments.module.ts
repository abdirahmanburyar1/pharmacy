import { Module } from '@nestjs/common';
import { AdjustmentsService } from './adjustments.service';
import { AdjustmentsController } from './adjustments.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [AdjustmentsService],
  controllers: [AdjustmentsController],
  exports: [AdjustmentsService],
})
export class AdjustmentsModule {}
