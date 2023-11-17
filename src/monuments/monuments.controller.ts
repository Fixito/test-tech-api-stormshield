import { Controller, Get, Post, Query, Param, HttpCode } from '@nestjs/common';
import { MonumentService } from './monuments.service';
import { QueryDto, MonumentDto } from './dto/index';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';

@Controller()
@ApiTags('monuments')
export class MonumentController {
  constructor(private readonly monumentService: MonumentService) {}

  @Get('monuments')
  @ApiOkResponse({ type: MonumentDto, isArray: true })
  async getMonuments(
    @Query()
    queryDto: QueryDto,
  ) {
    return this.monumentService.getAllMonuments(queryDto);
  }

  @HttpCode(200)
  @Post('best-monument/:id')
  @ApiOkResponse({ type: MonumentDto })
  addMonumentsToFavourites(@Param('id') id: string) {
    return this.monumentService.addMonumentToFavourites(id);
  }

  @Get('types')
  @ApiOkResponse({
    type: String,
    isArray: true,
  })
  getMonumentTypes() {
    return this.monumentService.getMonumentTypes();
  }
}
