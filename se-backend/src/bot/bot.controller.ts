import { Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {

    constructor(private readonly botService: BotService) {}

    @Get()
    findAll(@Query('state') state?: 'IDLE' | 'WORKING') {
        return this.botService.findAll(state)
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.botService.findOne(id)
    }

    @Post('create')
    async create() {
        return this.botService.create()
    }

    @Delete('delete/:id')
    async remove(@Param('id') id: number) {
        return this.botService.remove(id)
    }
}
