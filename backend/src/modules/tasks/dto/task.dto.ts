import { Type } from 'class-transformer';
import {
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CHANNELS, TASK_STATUSES, TASK_TYPES, type Channel, type TaskStatus, type TaskType } from '@campaign-ops/core';

const FS_ID = /^FS-\d{2,}$/;

export class CreateTaskDto {
  @IsIn(TASK_TYPES)
  type: TaskType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsIn(CHANNELS)
  channel?: Channel;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(FS_ID, { each: true })
  factRefs?: string[];

  @IsOptional()
  @IsString()
  owner?: string;

  /** Site / SEO / GEO changes: the page they touch (one live change per page). */
  @IsOptional()
  @IsString()
  pageUrl?: string;
}

export class PatchTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(FS_ID, { each: true })
  factRefs?: string[];

  @IsOptional()
  @IsString()
  owner?: string;

  /** Mark the edit non-substantive (needs scopeRef from the pre-approved list). */
  @IsOptional()
  @IsBoolean()
  nonSubstantive?: boolean;

  @IsOptional()
  @IsString()
  scopeRef?: string;

  @IsOptional()
  @Equals(false)
  needsRereview?: false;
}

export class QAItemDto {
  @IsString()
  item: string;

  @IsBoolean()
  ok: boolean;
}

export class QAInputDto {
  @IsBoolean()
  passed: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QAItemDto)
  checklist: QAItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransitionDto {
  @IsIn(TASK_STATUSES)
  to: TaskStatus;

  @IsOptional()
  @IsString()
  note?: string;

  /** Required for qa → awaiting_approval. */
  @IsOptional()
  @ValidateNested()
  @Type(() => QAInputDto)
  qa?: QAInputDto;
}
