import { Controller, DefaultValuePipe, Get, Module, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReconciliationService } from '@campaign-ops/core';

@ApiTags('reconciliation')
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly recon: ReconciliationService) {}

  @Get()
  get(@Query('weeks', new DefaultValuePipe(3), ParseIntPipe) weeks: number) {
    return this.recon.get(weeks);
  }
}

@ApiTags('reconciliation')
@Controller('funnel')
export class FunnelController {
  constructor(private readonly recon: ReconciliationService) {}

  @Get()
  get(@Query('weeks', new DefaultValuePipe(3), ParseIntPipe) weeks: number) {
    return this.recon.funnel(weeks);
  }
}

@Module({ controllers: [ReconciliationController, FunnelController] })
export class ReconciliationModule {}
