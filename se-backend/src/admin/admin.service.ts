import { Injectable } from '@nestjs/common';
import { BotService } from 'src/bot/bot.service';

@Injectable()
export class AdminService {

    constructor(private readonly botService: BotService) {}

    getBots() {
        return this.botService.findAll
    }

    getBotById(id: number) {
        return this.botService.findOne(id)
    }

    async createBot() {
        return this.botService.create()
    }

    async removeBot(id: number) {
        return this.botService.remove(id)
    }
}
