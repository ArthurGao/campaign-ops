import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/actor.decorator';
import { Roles } from '../../common/roles.guard';
import { AGENT_IDS, RUN_STATUSES, type AgentId, type RunStatus } from '@campaign-ops/core';
import type { Actor } from '@campaign-ops/core';
import { AgentsService } from '@campaign-ops/core';
import { DecisionDto, StartRunDto } from './dto/agent.dto';

@ApiTags('agents')
@ApiHeader({ name: 'X-Role', required: false })
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  cards() {
    return this.agents.cards();
  }

  @Get('runs')
  @ApiQuery({ name: 'agent', enum: AGENT_IDS, required: false })
  @ApiQuery({ name: 'status', enum: RUN_STATUSES, required: false })
  runs(@Query('agent') agent?: AgentId, @Query('status') status?: RunStatus) {
    return this.agents.runs({ agent, status });
  }

  @Get('runs/:runId')
  run(@Param('runId') runId: string) {
    return this.agents.run(runId);
  }

  @Post(':agentId/runs')
  @HttpCode(202)
  @Roles('pm')
  start(@Param('agentId') agentId: string, @Body() dto: StartRunDto, @CurrentActor() actor: Actor) {
    return this.agents.start(agentId, dto.trigger, dto.inputs, actor);
  }

  @Post('runs/:runId/outputs/:outputId/decision')
  @Roles('pm')
  decide(@Param('runId') runId: string, @Param('outputId') outputId: string, @Body() dto: DecisionDto, @CurrentActor() actor: Actor) {
    return this.agents.decide(runId, outputId, dto.status, dto.note, actor);
  }
}
