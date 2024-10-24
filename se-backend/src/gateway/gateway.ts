import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Server } from 'socket.io';
  
  @WebSocketGateway({
    cors: {
      origin: 'http://localhost:8081', // Allow your frontend origin
      credentials: true,
    },
  })
  export class Gateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  
    @WebSocketServer() server: Server;
  
    afterInit(server: Server) {
      console.log(`WebSocket Gateway Initialized ${server}`);
    }
  
    handleConnection(client: any) {
      console.log(`Client connected: ${client.id}`);
    }
  
    handleDisconnect(client: any) {
      console.log(`Client disconnected: ${client.id}`);
    }
  
    emitBotCreated(bot: any) {
      this.server.emit('botCreated', { bot });
      console.log(`botCreated ${bot}`)
    }
  
    emitBotRemoved(botId: number) {
      this.server.emit('botRemoved', { botId });
      console.log(`BotRemoved ${botId}`)
    }

    emitBotIdle(botId: number) {
        this.server.emit('botIdle', { botId });
        console.log(`botIdle ${botId}`)
    }

    emitBotListUpdated(bots: any) {
      this.server.emit('botListUpdated', {bots});
      console.log('bot list updated');
    }
  
    emitOrderProcessing(orderId: number, botId: number) {
      this.server.emit('orderProcessing', { orderId, botId });
      console.log(`orderProcessing ${orderId}`)
    }

    emitOrderCompleted(orderId: number, botId: number) {
        this.server.emit('orderCompleted', { orderId, botId });
        console.log(`orderCompleted ${orderId}`)
    }
  
    emitOrderCreated(order: any) {
      this.server.emit('orderCreated', { order });
      console.log(`orderCreated ${order.id}`)
    }
  
    emitOrderRemoved(orderId: number) {
      this.server.emit('orderRemoved', { orderId });
      console.log(`orderRemoved ${orderId}`)
    }

    emitOrderListUpdated(orders: any[]) {
        this.server.emit('orderListUpdated', { orders });
        console.log(`orderListUpdated`)
      }
  
    emitCustomerCreated(customer: any) {
      this.server.emit('customerCreated', { customer });
      console.log(`customerCreated ${customer}`)
    }
  }
  