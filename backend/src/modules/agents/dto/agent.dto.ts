import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import {
  DECISION_STATUSES,
  RUN_TRIGGERS,
  type DecisionStatus,
  type RunTrigger,
} from '@campaign-ops/core';

export class StartRunDto {
  @IsOptional()
  @IsIn(RUN_TRIGGERS)
  trigger?: RunTrigger;

  /**
   * Audit: siteUrl, scope[] (the TEST-enquiry consent comes from Settings). Outbound: mode (draft|qa|verify), taskId, channel,
   * spec, briefId, packageId. Feedback: dateRange, scope[], afterLaunchOf.
   */
  @IsObject()
  inputs: Record<string, unknown>;
}

export class DecisionDto {
  @IsIn(DECISION_STATUSES)
  status: DecisionStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
