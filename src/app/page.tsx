"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrderController } from "@/hooks/useOrderController";
import { OrderForm } from "@/components/OrderForm";
import { OrderItem } from "@/types";

export default function OrderController() {
  const {
    state,
    pendingOrders,
    processingOrders,
    completeOrders,
    createOrder,
    addBot,
    removeBot,
    canAddBot,
    maxBots,
    maxOrdersPerStatus,
  } = useOrderController();

  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [orderFormType, setOrderFormType] = useState<'normal' | 'vip'>('normal');

  const handleOrderSubmit = (items: OrderItem[], orderType: 'normal' | 'vip') => {
    createOrder(orderType, items);
  };

  const openOrderForm = (type: 'normal' | 'vip') => {
    setOrderFormType(type);
    setOrderFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-2">McDonald&apos;s Order Controller</h1>
          <p className="text-muted-foreground">Automated Cooking Bot Management System</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Control Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Button 
                onClick={() => openOrderForm('normal')} 
                variant="default"
              >
                New Normal Order
              </Button>
              <Button 
                onClick={() => openOrderForm('vip')} 
                variant="default" 
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                New VIP Order
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <Button onClick={addBot} variant="outline" disabled={!canAddBot}>
                + Bot {!canAddBot ? `(Max ${maxBots})` : ''}
              </Button>
              <Button onClick={removeBot} variant="outline" disabled={state.bots.length === 0}>
                - Bot
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Alert>
                <AlertDescription>
                  <strong>Active Bots:</strong> {state.bots.length} / {maxBots}
                </AlertDescription>
              </Alert>
              <Alert>
                <AlertDescription>
                  <strong>Total Orders:</strong> {state.orders.length}
                </AlertDescription>
              </Alert>
              <Alert>
                <AlertDescription>
                  <strong>Queue:</strong> {pendingOrders.length} pending, {processingOrders.length} processing
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                PENDING
                <Badge variant="secondary">{pendingOrders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {pendingOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending orders</p>
              ) : (
                <>
                  {pendingOrders.slice(0, maxOrdersPerStatus).map((order, index) => (
                    <div key={order.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">
                          Order #{order.id}
                          {index === 0 && <Badge variant="secondary" className="ml-2 text-xs">NEXT</Badge>}
                        </span>
                        <Badge variant={order.type === 'vip' ? 'default' : 'outline'}
                          className={order.type === 'vip' ? 'bg-yellow-600' : ''}>
                          {order.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="text-muted-foreground">
                          {order.items.length} item(s) • ${order.total.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.items.slice(0, 2).map(item => `${item.quantity}x ${item.menuItem.name}`).join(', ')}
                          {order.items.length > 2 && ` +${order.items.length - 2} more`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Created: {order.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {pendingOrders.length > maxOrdersPerStatus && (
                    <div className="text-center py-2 text-sm text-muted-foreground border-t">
                      + {pendingOrders.length - maxOrdersPerStatus} more orders...
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                PROCESSING
                <Badge variant="secondary">{processingOrders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {processingOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No processing orders</p>
              ) : (
                processingOrders.slice(0, maxOrdersPerStatus).map(order => (
                  <div key={order.id} className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Order #{order.id}</span>
                      <Badge variant={order.type === 'vip' ? 'default' : 'outline'}
                        className={order.type === 'vip' ? 'bg-yellow-600' : ''}>
                        {order.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="text-muted-foreground">
                        {order.items.length} item(s) • ${order.total.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.items.slice(0, 2).map(item => `${item.quantity}x ${item.menuItem.name}`).join(', ')}
                        {order.items.length > 2 && ` +${order.items.length - 2} more`}
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Bot #{order.status === 'processing' ? order.processingBotId : 'N/A'}</span>
                        <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900">
                          Processing...
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Started: {order.status === 'processing' ? order.processingStartedAt?.toLocaleTimeString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                COMPLETE
                <Badge variant="secondary">{completeOrders.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {completeOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No completed orders</p>
              ) : (
                <>
                  {completeOrders.slice(0, maxOrdersPerStatus).map(order => (
                    <div key={order.id} className="p-3 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Order #{order.id}</span>
                        <Badge variant={order.type === 'vip' ? 'default' : 'outline'}
                          className={order.type === 'vip' ? 'bg-yellow-600' : ''}>
                          {order.type.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="text-muted-foreground">
                          {order.items.length} item(s) • ${order.total.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.items.slice(0, 2).map(item => `${item.quantity}x ${item.menuItem.name}`).join(', ')}
                          {order.items.length > 2 && ` +${order.items.length - 2} more`}
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Completed by Bot #{order.status === 'complete' ? order.processingBotId : 'N/A'}</span>
                          <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                            ✓ Done
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Finished: {order.status === 'complete' ? order.completedAt?.toLocaleTimeString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {completeOrders.length > maxOrdersPerStatus && (
                    <div className="text-center py-2 text-sm text-muted-foreground border-t">
                      Showing recent {maxOrdersPerStatus} orders
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bot Status</CardTitle>
          </CardHeader>
          <CardContent>
            {state.bots.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No bots active</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {state.bots.map(bot => (
                  <div key={bot.id} className="p-3 border rounded-lg text-center">
                    <div className="font-medium">Bot #{bot.id}</div>
                    <Badge variant={bot.status === 'idle' ? 'outline' : 'default'}>
                      {bot.status.toUpperCase()}
                    </Badge>
                    {bot.status === 'processing' && (
                      <p className="text-sm text-muted-foreground">
                        Order #{bot.currentOrderId}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderForm
        isOpen={orderFormOpen}
        onClose={() => setOrderFormOpen(false)}
        onSubmit={handleOrderSubmit}
        orderType={orderFormType}
      />
    </div>
  );
}
