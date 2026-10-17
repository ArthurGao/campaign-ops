import { Module } from '@nestjs/common';
import { FactSheetController } from './fact-sheet.controller';

@Module({ controllers: [FactSheetController] })
export class FactSheetModule {}
