import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FACT_PAGES, type FactPage } from '@campaign-ops/core';

export class CreateFactDto {
  @IsIn(FACT_PAGES)
  page: FactPage;

  @IsString()
  @IsNotEmpty()
  label: string;

  /** Use [TBC] placeholders for anything not confirmed. */
  @IsString()
  @IsNotEmpty()
  statement: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  publicNote?: string;
}

export class PatchFactDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;

  /** Changing the statement of a confirmed entry sends it back to pending. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  statement?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  publicNote?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class ConfirmFactDto {
  /** Document name or URL. Empty → 409. */
  @IsString()
  source: string;

  /** Present → status confirmed_with_expiry. */
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  publicNote?: string;
}

export class RejectFactDto {
  @IsString()
  @IsNotEmpty()
  note: string;
}
