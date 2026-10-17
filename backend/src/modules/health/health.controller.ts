import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MemoryStore, type Clock } from '@campaign-ops/core';
import { CLOCK } from '../../core/core.module';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly store: MemoryStore,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get()
  get() {
    return { ok: true, seedVersion: this.store.data.seedVersion, now: this.clock.now().toISOString() };
  }
}
