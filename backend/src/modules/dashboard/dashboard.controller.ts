import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from '@campaign-ops/core';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get() {
    return this.dashboard.get();
  }
}

@Module({ controllers: [DashboardController] })
export class DashboardModule {}
