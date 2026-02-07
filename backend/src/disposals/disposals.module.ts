import { Module } from '@nestjs/common';
import { DisposalsService } from './disposals.service';
import { DisposalsController } from './disposals.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [DisposalsService],
  controllers: [DisposalsController],
  exports: [DisposalsService],
})
export class DisposalsModule {}
