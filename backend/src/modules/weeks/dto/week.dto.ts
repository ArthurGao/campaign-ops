import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { HOUR_CATEGORIES, type HourCategory } from '@campaign-ops/core';

export class SetPlanDto {
  @IsArray()
  @IsString({ each: true })
  taskIds: string[];
}

export class LogTimeDto {
  @IsIn(HOUR_CATEGORIES)
  category: HourCategory;

  /** Quarter hours, 0.25–8; the range and step are checked by the core rule. */
  @Type(() => Number)
  @IsNumber()
  hours: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;
}

export class SaveReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  done?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  blocked?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  next?: string;
}
