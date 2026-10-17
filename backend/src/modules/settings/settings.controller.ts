import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/actor.decorator';
import type { Actor } from '@campaign-ops/core';
import { PatchSettingsDto } from './dto/settings.dto';
import { SettingsService } from '@campaign-ops/core';

@ApiTags('settings')
@ApiHeader({ name: 'X-Role', required: false })
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  /** pm for most sections; preApprovedScope and people.approvers need a client role. */
  @Patch()
  patch(@Body() dto: PatchSettingsDto, @CurrentActor() actor: Actor) {
    return this.settings.patch(dto, actor);
  }

  /** Any role: reloads the seed. */
  @Post('reset-demo')
  reset() {
    return this.settings.resetDemo();
  }

  @Get('utm-preview')
  utmPreview(@Query('source') source?: string, @Query('medium') medium?: string, @Query('content') content?: string) {
    return this.settings.utmPreview({ source, medium, content });
  }
}
