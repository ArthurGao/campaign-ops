import { Body, Controller, Get, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiHeader, ApiParam, ApiTags } from '@nestjs/swagger';
import { WeeksService, type Actor } from '@campaign-ops/core';
import { CurrentActor } from '../../common/actor.decorator';
import { Roles } from '../../common/roles.guard';
import { LogTimeDto, SaveReportDto, SetPlanDto } from './dto/week.dto';

/** Weekly loop (D-37): plan, the PM's 16 hours, the weekly report. ':week' is a Monday or 'current'. */
@ApiTags('weeks')
@ApiHeader({ name: 'X-Role', required: false })
@ApiParam({ name: 'week', example: 'current' })
@Controller('weeks')
export class WeeksController {
  constructor(private readonly weeks: WeeksService) {}

  @Get()
  list() {
    return this.weeks.list();
  }

  @Get(':week')
  get(@Param('week') week: string) {
    return this.weeks.get(week);
  }

  @Patch(':week/plan')
  @Roles('pm')
  setPlan(@Param('week') week: string, @Body() dto: SetPlanDto, @CurrentActor() actor: Actor) {
    return this.weeks.setPlan(week, dto.taskIds, actor);
  }

  @Post(':week/time')
  @Roles('pm')
  logTime(@Param('week') week: string, @Body() dto: LogTimeDto, @CurrentActor() actor: Actor) {
    return this.weeks.logTime(week, dto, actor);
  }

  @Patch(':week/report')
  @Roles('pm')
  saveReport(
    @Param('week') week: string,
    @Body() dto: SaveReportDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.weeks.saveReport(week, dto, actor);
  }

  @Post(':week/report/send')
  @Roles('pm')
  send(@Param('week') week: string, @CurrentActor() actor: Actor) {
    return this.weeks.sendReport(week, actor);
  }
}

@Module({ controllers: [WeeksController] })
export class WeeksModule {}
