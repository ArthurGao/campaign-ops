import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  SOURCE_MEDIUMS,
  STAGES,
  VALIDITIES,
  type SourceMedium,
  type Stage,
  type Validity,
} from '@campaign-ops/core';

export class ContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class EnquiryDto {
  @IsString()
  tour: string;

  /** Month, e.g. 2027-03. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  travelDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  people?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LeadSourceDto {
  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsIn(SOURCE_MEDIUMS)
  utmMedium?: SourceMedium;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsString()
  channelLabel: string;
}

export class CreateLeadDto {
  @ValidateNested()
  @Type(() => ContactDto)
  contact: ContactDto;

  @ValidateNested()
  @Type(() => EnquiryDto)
  enquiry: EnquiryDto;

  @ValidateNested()
  @Type(() => LeadSourceDto)
  source: LeadSourceDto;

  @IsOptional()
  @IsString()
  selfReportedSource?: string;
}

export class OrderDto {
  @IsString()
  tour: string;

  @IsInt()
  @Min(1)
  people: number;
}

export class PatchLeadDto {
  @IsOptional()
  @IsIn(VALIDITIES)
  validity?: Validity;

  /** Required when validity is invalid. */
  @IsOptional()
  @IsString()
  validityReason?: string;

  @IsOptional()
  @IsIn(STAGES)
  stage?: Stage;

  /** Required when stage is lost. */
  @IsOptional()
  @IsString()
  lostReason?: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsISO8601()
  firstResponseAt?: string;

  /** null removes the order. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @ValidateNested()
  @Type(() => OrderDto)
  order?: OrderDto | null;
}

export class MergeLeadDto {
  @Matches(/^L-\d{4}$/)
  intoId: string;
}
