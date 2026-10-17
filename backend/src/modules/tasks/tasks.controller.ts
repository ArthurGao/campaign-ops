import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/actor.decorator';
import { Roles } from '../../common/roles.guard';
import { CHANNELS, TASK_STATUSES, TASK_TYPES, type Channel, type TaskStatus, type TaskType } from '@campaign-ops/core';
import type { Actor } from '@campaign-ops/core';
import { CreatePackageDto } from '../packages/dto/package.dto';
import { CreateTaskDto, PatchTaskDto, TransitionDto } from './dto/task.dto';
import { TasksService } from '@campaign-ops/core';

@ApiTags('tasks')
@ApiHeader({ name: 'X-Role', required: false })
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiQuery({ name: 'status', enum: TASK_STATUSES, required: false })
  @ApiQuery({ name: 'type', enum: TASK_TYPES, required: false })
  @ApiQuery({ name: 'channel', enum: CHANNELS, required: false })
  list(@Query('status') status?: TaskStatus, @Query('type') type?: TaskType, @Query('channel') channel?: Channel) {
    return this.tasks.list({ status, type, channel });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tasks.get(id);
  }

  @Get(':id/gates')
  gates(@Param('id') id: string) {
    return this.tasks.gates(id);
  }

  @Post()
  @Roles('pm')
  create(@Body() dto: CreateTaskDto, @CurrentActor() actor: Actor) {
    return this.tasks.create(dto, actor);
  }

  @Patch(':id')
  @Roles('pm')
  patch(@Param('id') id: string, @Body() dto: PatchTaskDto, @CurrentActor() actor: Actor) {
    return this.tasks.patch(id, dto, actor);
  }

  /** Role and invariant checks depend on the target status; see docs/02-data-model.md. */
  @Post(':id/transition')
  transition(@Param('id') id: string, @Body() dto: TransitionDto, @CurrentActor() actor: Actor) {
    return this.tasks.transition(id, dto, actor);
  }

  @Post(':id/create-package')
  @Roles('pm')
  createPackage(@Param('id') id: string, @Body() dto: CreatePackageDto, @CurrentActor() actor: Actor) {
    return this.tasks.createPackage(id, dto, actor);
  }

  /** Returns a prefilled brief draft; send it to POST /factory/briefs to store it. */
  @Post(':id/create-brief')
  @Roles('pm')
  createBrief(@Param('id') id: string) {
    return this.tasks.briefPrefill(id);
  }
}
