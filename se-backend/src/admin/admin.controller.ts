import { Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AdminService } from './admin.service';


@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}


    @Get('bots')
    getBots() {
        return this.adminService.getBots()
    }

    @Get('bot/:id')
    getBotById(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.getBotById(id)
    }

    @Post('createBot')
    async createBot() {
        return this.adminService.createBot()
    }

    @Delete('deleteBot/:id')
    async removeBot(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.removeBot(id)
    }

}
