import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/actor.decorator';
import { Roles } from '../../common/roles.guard';
import { FACT_PAGES, type FactPage } from '@campaign-ops/core';
import { AppError } from '@campaign-ops/core';
import type { Actor } from '@campaign-ops/core';
import { ConfirmFactDto, CreateFactDto, PatchFactDto, RejectFactDto } from './dto/fact.dto';
import { FactSheetService } from '@campaign-ops/core';

@ApiTags('fact-sheet')
@ApiHeader({ name: 'X-Role', required: false })
@Controller('fact-sheet')
export class FactSheetController {
  constructor(private readonly facts: FactSheetService) {}

  @Get()
  @ApiQuery({ name: 'page', enum: FACT_PAGES, required: false })
  list(@Query('page') page?: FactPage) {
    if (page && !FACT_PAGES.includes(page)) throw new AppError('VALIDATION', `page must be one of ${FACT_PAGES.join(', ')}`, undefined, 400);
    return this.facts.list(page);
  }

  /** External entries only — the view the Outbound agent reads (I-F1). */
  @Get('external')
  external() {
    return { version: this.facts.version(), entries: this.facts.getExternal() };
  }

  @Get('versions')
  versions() {
    return this.facts.versions();
  }

  @Get(':id/usages')
  usages(@Param('id') id: string) {
    return this.facts.usages(id);
  }

  @Post()
  @Roles('pm')
  create(@Body() dto: CreateFactDto, @CurrentActor() actor: Actor) {
    return this.facts.create(dto, actor);
  }

  @Patch(':id')
  @Roles('pm')
  patch(@Param('id') id: string, @Body() dto: PatchFactDto, @CurrentActor() actor: Actor) {
    return this.facts.patch(id, dto, actor);
  }

  @Post(':id/confirm')
  @Roles('client_approver', 'client_decision_maker')
  confirm(@Param('id') id: string, @Body() dto: ConfirmFactDto, @CurrentActor() actor: Actor) {
    return this.facts.confirm(id, dto, actor);
  }

  @Post(':id/reject')
  @Roles('client_approver', 'client_decision_maker')
  reject(@Param('id') id: string, @Body() dto: RejectFactDto, @CurrentActor() actor: Actor) {
    return this.facts.reject(id, dto.note, actor);
  }
}
