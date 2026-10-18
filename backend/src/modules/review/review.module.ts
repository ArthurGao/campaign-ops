import { Body, Controller, Get, Module, Patch, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { ReviewService, type Actor } from '@campaign-ops/core';
import { CurrentActor } from '../../common/actor.decorator';
import { Roles } from '../../common/roles.guard';
import { SaveReviewDto } from './dto/review.dto';

/** Campaign review (D-40): per channel scale / keep / stop / wait, sent to the client once. */
@ApiTags('review')
@ApiHeader({ name: 'X-Role', required: false })
@Controller('review')
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  @Get()
  get() {
    return this.review.get();
  }

  @Patch()
  @Roles('pm')
  save(@Body() dto: SaveReviewDto, @CurrentActor() actor: Actor) {
    return this.review.save(dto, actor);
  }

  @Post('send')
  @Roles('pm')
  send(@CurrentActor() actor: Actor) {
    return this.review.send(actor);
  }
}

@Module({ controllers: [ReviewController] })
export class ReviewModule {}
