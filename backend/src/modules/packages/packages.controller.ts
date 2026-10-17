import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/actor.decorator';
import { Roles } from '../../common/roles.guard';
import { PACKAGE_STATUSES, type PackageStatus } from '@campaign-ops/core';
import type { Actor } from '@campaign-ops/core';
import { NoteDto, PatchPackageDto, PublishedDto, RequiredNoteDto, VerifyPackageDto } from './dto/package.dto';
import { PackagesService } from '@campaign-ops/core';

@ApiTags('packages')
@ApiHeader({ name: 'X-Role', required: false })
@Controller()
export class PackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get('packages')
  @ApiQuery({ name: 'status', enum: PACKAGE_STATUSES, required: false })
  list(@Query('status') status?: PackageStatus) {
    return this.packages.list(status);
  }

  @Get('packages/:id')
  get(@Param('id') id: string) {
    return this.packages.get(id);
  }

  @Patch('packages/:id')
  @Roles('pm')
  patch(@Param('id') id: string, @Body() dto: PatchPackageDto, @CurrentActor() actor: Actor) {
    return this.packages.patch(id, dto, actor);
  }

  /** Client roles; the PM only for a pending non-substantive edit within scope. */
  @Post('packages/:id/approve')
  approve(@Param('id') id: string, @Body() dto: NoteDto, @CurrentActor() actor: Actor) {
    return this.packages.approve(id, actor, dto.note);
  }

  @Post('packages/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RequiredNoteDto, @CurrentActor() actor: Actor) {
    return this.packages.reject(id, actor, dto.note);
  }

  @Post('packages/:id/schedule')
  schedule(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.packages.schedule(id, actor);
  }

  @Post('packages/:id/published')
  published(@Param('id') id: string, @Body() dto: PublishedDto, @CurrentActor() actor: Actor) {
    return this.packages.published(id, actor, dto.postUrl, dto.at);
  }

  @Post('packages/:id/verify')
  verify(@Param('id') id: string, @Body() dto: VerifyPackageDto, @CurrentActor() actor: Actor) {
    return this.packages.verify(id, actor, dto.result, dto.note);
  }

  @Post('packages/:id/take-down')
  takeDown(@Param('id') id: string, @Body() dto: RequiredNoteDto, @CurrentActor() actor: Actor) {
    return this.packages.takeDown(id, actor, dto.note);
  }

  @Get('publish-log')
  publishLog() {
    return this.packages.publishLog();
  }
}
