import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  ValidateNested,
} from 'class-validator';
import {
  BLOCKS,
  CHANNELS,
  EVIDENCE_SOURCES,
  EVIDENCE_STATUSES,
  PRIORITIES,
  TASK_TYPES,
  type Blocks,
  type Channel,
  type EvidenceSource,
  type EvidenceStatus,
  type Priority,
  type TaskType,
} from '@campaign-ops/core';

export class ProofDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url?: string;
}

export class CreateEvidenceDto {
  @IsIn(EVIDENCE_SOURCES)
  source: EvidenceSource;

  @IsString()
  @IsNotEmpty()
  finding: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProofDto)
  proof: ProofDto[];

  @IsString()
  impact: string;

  @IsIn(BLOCKS)
  blocks: Blocks;

  @IsIn(PRIORITIES)
  priority: Priority;

  @IsString()
  suggestedOwner: string;

  @IsBoolean()
  needsApproval: boolean;
}

export class PatchEvidenceDto {
  @IsOptional()
  @IsIn(EVIDENCE_STATUSES)
  status?: EvidenceStatus;

  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: Priority;

  @IsOptional()
  @IsString()
  suggestedOwner?: string;

  @IsOptional()
  @IsIn(BLOCKS)
  blocks?: Blocks;

  /** Required when dismissing. */
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ConvertEvidenceDto {
  @IsIn(TASK_TYPES)
  type: TaskType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsIn(CHANNELS)
  channel?: Channel;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Matches(/^FS-\d{2,}$/, { each: true })
  factRefs?: string[];
}
