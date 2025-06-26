import { NextResponse } from 'next/server';
import { createBot, getBots, removeLatestBot } from '../orders/order.service';

export async function POST(req: Request) {
  try {
    const newBot = await createBot();
    return NextResponse.json(newBot, {status: 201})
  } catch (err){
    console.error('#Bot API POST error', err);
    return NextResponse.json({error: 'Failed to create bot.'}, {status: 500})
  }
}

export async function GET() {
  try {
    const bots = await getBots();
    console.log('GET bots', bots);
    return NextResponse.json(bots);
  } catch (err) {
    console.error('#Bot API GET error', err);
    return NextResponse.json({error: 'Failed to get bots.'}, {status: 500});
  }
}

export async function DELETE() {
  try {
    removeLatestBot();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete bot.' }, { status: 500 });
  }
}