import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScopeDto {
  /** Channel → cap in NZD cents. */
  @IsOptional()
  @IsObject()
  budgetCapCentsByChannel?: Record<string, number>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pauseConditions?: string[];

  @IsOptional()
  @IsString()
  allowedAssetScope?: string;

  @IsOptional()
  @IsBoolean()
  pmMayApproveNonSubstantive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nonSubstantiveList?: string[];
}

export class AlertOwnerDto {
  @IsString()
  name: string;

  @IsString()
  contact: string;

  @IsInt()
  @Min(1)
  responseMinutes: number;
}

export class PeopleDto {
  @IsOptional()
  @IsObject()
  approvers?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => AlertOwnerDto)
  alertOwnerOutsideHours?: AlertOwnerDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  executors?: string[];

  @IsOptional()
  @IsString()
  landingPageDailyOwner?: string;
}

export class LandingChecksDto {
  @IsOptional() @IsBoolean() factsConfirmed?: boolean;
  @IsOptional() @IsBoolean() leadFiresOnce?: boolean;
  @IsOptional() @IsBoolean() sourceCaptured?: boolean;
  @IsOptional() @IsBoolean() reachesSales?: boolean;
}

export class LandingPageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  url?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingChecksDto)
  checks?: LandingChecksDto;
}

export class PatchSettingsDto {
  /** Client roles only. */
  @IsOptional()
  @ValidateNested()
  @Type(() => ScopeDto)
  preApprovedScope?: ScopeDto;

  /** `approvers` needs a client role; the rest the PM. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PeopleDto)
  people?: PeopleDto;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  utmTemplate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prohibitedWords?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingPageDto)
  landingPage?: LandingPageDto;

  @IsOptional()
  @IsBoolean()
  factorySupportsIdempotency?: boolean;
}
