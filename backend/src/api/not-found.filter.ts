import { ExceptionFilter, Catch, ArgumentsHost, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { BotNotFoundError } from '../domain/errors';

@Catch(BotNotFoundError)
export class BotNotFoundFilter implements ExceptionFilter {
  catch(exception: BotNotFoundError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const nestEx = new NotFoundException(exception.message);
    response.status(nestEx.getStatus()).json(nestEx.getResponse());
  }
}
