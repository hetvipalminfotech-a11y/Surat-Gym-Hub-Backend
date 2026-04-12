import { Module } from '@nestjs/common';
import { PtSessionsController } from './pt-sessions.controller';
import { PtSessionsService } from './pt-sessions.service';

@Module({
  controllers: [PtSessionsController],
  providers: [PtSessionsService],
  exports: [PtSessionsService],
})
export class PtSessionsModule {}
