import { OrderController } from '../domain/order-controller';
import { OrderType } from '../domain/types';
import { BotNotFoundError } from '../domain/errors';

function flag(tokens: string[], name: string): string | undefined {
  const i = tokens.indexOf(`--${name}`);
  return i >= 0 ? tokens[i + 1] : undefined;
}

function parseType(v: string | undefined): OrderType {
  if (v === undefined) return 'NORMAL';
  const up = v.toUpperCase();
  if (up !== 'NORMAL' && up !== 'VIP') throw new Error(`invalid --type "${v}" (normal|vip)`);
  return up;
}

export function runCommand(ctrl: OrderController, line: string): string {
  const tokens = line.trim().split(/\s+/);
  const cmd = tokens[0] ?? '';
  const rest = tokens.slice(1);
  try {
    switch (cmd) {
      case 'add-order': {
        const o = ctrl.addOrder(parseType(flag(rest, 'type')));
        return `Created ${o.type} order #${o.id}`;
      }
      case 'add-bot': {
        const b = ctrl.addBot();
        return `Created bot #${b.id}`;
      }
      case 'del-bot': {
        const idStr = flag(rest, 'id');
        const b = ctrl.removeBot(idStr !== undefined ? Number(idStr) : undefined);
        return `Removed bot #${b.id}`;
      }
      case 'list-orders': {
        const typeStr = flag(rest, 'type');
        const type = typeStr !== undefined ? parseType(typeStr) : undefined;
        return JSON.stringify(ctrl.listOrders(type));
      }
      case 'list-bots':
        return JSON.stringify(ctrl.listBots());
      case 'status':
        return JSON.stringify(ctrl.snapshot());
      case 'help':
        return 'add-order [--type normal|vip] | add-bot | del-bot [--id N] | list-orders [--type normal|vip] | list-bots | status | exit';
      case 'exit':
        return '__EXIT__';
      case '':
        return '';
      default:
        return `Unknown command: ${cmd} (try 'help')`;
    }
  } catch (e) {
    if (e instanceof BotNotFoundError) return e.message;
    return `Error: ${(e as Error).message}`;
  }
}
