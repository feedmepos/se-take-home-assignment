import { Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BotService } from './bot.service';

@ApiTags('bots')
@Controller('bots')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post()
  @ApiOperation({ summary: 'Add a bot (+ Bot)', description: 'Creates a new cooking bot. The bot immediately starts processing the next pending order if one exists, otherwise it waits in IDLE state.' })
  @ApiResponse({ status: 201, description: 'Bot created.' })
  addBot() {
    return this.botService.addBot();
  }

  @Delete()
  @ApiOperation({ summary: 'Remove a bot (- Bot)', description: 'Destroys the newest bot. If it was processing an order, that order is returned to the PENDING queue at its original priority position.' })
  @ApiResponse({ status: 200, description: 'Bot removed. Returns the removed bot; currentOrder is the order returned to PENDING (if any).' })
  removeLatestBot() {
    const removed = this.botService.removeLatestBot();
    if (!removed) {
      return { message: 'No bots to remove' };
    }
    return removed;
  }

  @Get()
  @ApiOperation({ summary: 'List all bots', description: 'Returns all active bots with their current status (IDLE or PROCESSING) and the order they are working on.' })
  @ApiResponse({ status: 200, description: 'List of bots.' })
  getBots() {
    return this.botService.getBots();
  }
}
