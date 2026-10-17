import { Type } from 'class-transformer';
import { Equals, IsBoolean, IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

export class PackageAssetDto {
  @IsString()
  @IsNotEmpty()
  assetId: string;

  @IsUrl({ require_tld: false })
  url: string;

  @IsString()
  checksum: string;
}

export class PatchPackageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  caption?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PackageAssetDto)
  asset?: PackageAssetDto;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  /** Marks the edit non-substantive; needs `scopeRef` from the pre-approved list. */
  @IsOptional()
  @IsBoolean()
  nonSubstantive?: boolean;

  @IsOptional()
  @IsString()
  scopeRef?: string;

  /** PM clears the re-review flag after checking a changed fact. */
  @IsOptional()
  @Equals(false)
  needsRereview?: false;
}

export class NoteDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class RequiredNoteDto {
  @IsString()
  note: string;
}

export class PublishedDto {
  @IsString()
  postUrl: string;

  @IsOptional()
  @IsISO8601()
  at?: string;
}

export class VerifyPackageDto {
  @IsIn(['verified', 'mismatch'])
  result: 'verified' | 'mismatch';

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreatePackageDto {
  /** Factory asset that passed QA; omit for text-only packages (e.g. search ads). */
  @IsOptional()
  @IsString()
  assetId?: string;

  /** Defaults from the task channel (facebook → facebook_feed …). */
  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
