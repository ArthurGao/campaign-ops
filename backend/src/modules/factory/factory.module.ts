import { Module } from '@nestjs/common';
import { FactoryController } from './factory.controller';

@Module({ controllers: [FactoryController] })
export class FactoryModule {}
