import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import {
  RECON_CHANNELS,
  REVIEW_DECISIONS,
  type ReconChannel,
  type ReviewDecision,
} from '@campaign-ops/core';

export class ReviewDecisionDto {
  @IsIn(RECON_CHANNELS)
  channel: ReconChannel;

  @IsIn(REVIEW_DECISIONS)
  decision: ReviewDecision;

  @IsString()
  @MaxLength(500)
  note: string;
}

export class SaveReviewDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewDecisionDto)
  decisions?: ReviewDecisionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  nextPhase?: string;
}
