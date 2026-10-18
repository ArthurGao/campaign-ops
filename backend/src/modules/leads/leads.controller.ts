import { Body, Controller, Get, Header, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/actor.decorator';
import { Roles } from '../../common/roles.guard';
import {
  SOURCE_MEDIUMS,
  STAGES,
  VALIDITIES,
  type SourceMedium,
  type Stage,
  type Validity,
} from '@campaign-ops/core';
import type { Actor } from '@campaign-ops/core';
import { CreateLeadDto, MergeLeadDto, PatchLeadDto } from './dto/lead.dto';
import { LeadsService } from '@campaign-ops/core';

@ApiTags('leads')
@ApiHeader({ name: 'X-Role', required: false })
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @ApiQuery({ name: 'validity', enum: VALIDITIES, required: false })
  @ApiQuery({ name: 'stage', enum: STAGES, required: false })
  @ApiQuery({ name: 'medium', enum: SOURCE_MEDIUMS, required: false })
  list(
    @Query('validity') validity?: Validity,
    @Query('stage') stage?: Stage,
    @Query('medium') medium?: SourceMedium,
  ) {
    return this.leads.list({ validity, stage, medium });
  }

  @Get('merge-suggestions')
  mergeSuggestions() {
    return this.leads.mergeSuggestions();
  }

  /** De-identified CSV (no names, emails, phones, click ids, notes). */
  @Get('export')
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="crm-export-deidentified.csv"')
  export() {
    return this.leads.exportCsv();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.leads.get(id);
  }

  @Post()
  @Roles('sales', 'pm')
  create(@Body() dto: CreateLeadDto, @CurrentActor() actor: Actor) {
    return this.leads.create(dto, actor);
  }

  @Patch(':id')
  @Roles('sales')
  patch(@Param('id') id: string, @Body() dto: PatchLeadDto, @CurrentActor() actor: Actor) {
    return this.leads.patch(id, dto, actor);
  }

  @Post(':id/merge')
  @Roles('sales')
  merge(@Param('id') id: string, @Body() dto: MergeLeadDto, @CurrentActor() actor: Actor) {
    return this.leads.merge(id, dto.intoId, actor);
  }
}
