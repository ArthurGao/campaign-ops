import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { RATIOS, type Ratio } from '@campaign-ops/core';

export class DeliverableDto {
  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsIn(RATIOS)
  ratio: Ratio;
}

export class CostCapDto {
  @IsInt()
  @Min(0)
  maxRerenders: number;

  @IsInt()
  @Min(1)
  maxCredits: number;
}

/** Body of POST /factory/briefs — normally the prefill from POST /tasks/:id/create-brief, edited. */
export class CreateBriefDto {
  @Matches(/^TASK-\d{3,}$/)
  taskId: string;

  @IsString()
  campaign: string;

  @IsString()
  @IsNotEmpty()
  objective: string;

  @IsString()
  marketLanguage: string;

  @IsString()
  factSheetVersion: string;

  @IsArray()
  @ArrayUnique()
  @Matches(/^FS-\d{2,}$/, { each: true })
  allowedFacts: string[];

  @IsArray()
  @IsString({ each: true })
  forbidden: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliverableDto)
  deliverables: DeliverableDto[];

  @IsArray()
  @IsString({ each: true })
  requirements: string[];

  @IsISO8601()
  deadline: string;

  @ValidateNested()
  @Type(() => CostCapDto)
  costCap: CostCapDto;

  @IsString()
  approver: string;
}

export class QAItemDto {
  @IsString()
  item: string;

  @IsBoolean()
  ok: boolean;
}

export class BriefQADto {
  @IsBoolean()
  passed: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QAItemDto)
  checklist: QAItemDto[];

  /** Required to return a receipt. */
  @IsOptional()
  @IsString()
  notes?: string;

  /** The person who reviewed captions, voice-over and key frames. */
  @IsOptional()
  @IsString()
  reviewerName?: string;
}
