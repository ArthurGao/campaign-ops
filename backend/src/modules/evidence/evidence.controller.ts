import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/actor.decorator';
import { Roles } from '../../common/roles.guard';
import {
  BLOCKS,
  EVIDENCE_SOURCES,
  EVIDENCE_STATUSES,
  PRIORITIES,
  type Blocks,
  type EvidenceSource,
  type EvidenceStatus,
  type Priority,
} from '@campaign-ops/core';
import type { Actor } from '@campaign-ops/core';
import { ConvertEvidenceDto, CreateEvidenceDto, PatchEvidenceDto } from './dto/evidence.dto';
import { EvidenceService } from '@campaign-ops/core';

@ApiTags('evidence')
@ApiHeader({ name: 'X-Role', required: false })
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Get()
  @ApiQuery({ name: 'source', enum: EVIDENCE_SOURCES, required: false })
  @ApiQuery({ name: 'blocks', enum: BLOCKS, required: false })
  @ApiQuery({ name: 'priority', enum: PRIORITIES, required: false })
  @ApiQuery({ name: 'status', enum: EVIDENCE_STATUSES, required: false })
  list(
    @Query('source') source?: EvidenceSource,
    @Query('blocks') blocks?: Blocks,
    @Query('priority') priority?: Priority,
    @Query('status') status?: EvidenceStatus,
  ) {
    return this.evidence.list({ source, blocks, priority, status });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.evidence.get(id);
  }

  @Post()
  @Roles('pm')
  create(@Body() dto: CreateEvidenceDto, @CurrentActor() actor: Actor) {
    return this.evidence.create(dto, actor);
  }

  @Patch(':id')
  @Roles('pm')
  patch(@Param('id') id: string, @Body() dto: PatchEvidenceDto, @CurrentActor() actor: Actor) {
    return this.evidence.patch(id, dto, actor);
  }

  /** Creates a Task (draft, or blocked if it cites unconfirmed facts) and marks the evidence converted. */
  @Post(':id/convert')
  @Roles('pm')
  convert(@Param('id') id: string, @Body() dto: ConvertEvidenceDto, @CurrentActor() actor: Actor) {
    return this.evidence.convert(id, dto, actor);
  }
}
