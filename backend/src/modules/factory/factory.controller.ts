import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/actor.decorator';
import { Roles } from '../../common/roles.guard';
import type { Actor } from '@campaign-ops/core';
import { NoteDto } from '../packages/dto/package.dto';
import { PackagesService } from '@campaign-ops/core';
import { BriefQADto, CreateBriefDto } from './dto/brief.dto';
import { BRIEF_QA_CHECKLIST, FactoryService } from '@campaign-ops/core';

@ApiTags('factory')
@ApiHeader({ name: 'X-Role', required: false })
@Controller('factory')
export class FactoryController {
  constructor(
    private readonly factory: FactoryService,
    private readonly packages: PackagesService,
  ) {}

  @Get('briefs')
  list() {
    return this.factory.list();
  }

  @Get('briefs/:id')
  get(@Param('id') id: string) {
    return this.factory.get(id);
  }

  /** Assets from QA-passed receipts (the only ones packages may use). */
  @Get('assets')
  assets() {
    return this.packages.availableAssets();
  }

  @Get('qa-checklist')
  checklist() {
    return BRIEF_QA_CHECKLIST;
  }

  @Post('briefs')
  @Roles('pm')
  create(@Body() dto: CreateBriefDto, @CurrentActor() actor: Actor) {
    return this.factory.create(dto, actor);
  }

  @Post('briefs/:id/send')
  @Roles('pm')
  send(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.factory.send(id, actor);
  }

  @Post('briefs/:id/qa')
  @Roles('pm')
  qa(@Param('id') id: string, @Body() dto: BriefQADto, @CurrentActor() actor: Actor) {
    return this.factory.qa(id, dto, actor);
  }

  @Post('briefs/:id/cancel')
  @Roles('pm')
  cancel(@Param('id') id: string, @Body() dto: NoteDto, @CurrentActor() actor: Actor) {
    return this.factory.cancel(id, actor, dto.note);
  }
}
