'use client';

import { OrderController } from "@/application/modules";
import { DashboardTemplate } from "@/presentation/components/templates/dashboard-template/DashboardTemplate";

export function OrderControllerPage() {
  const {
    pending,
    processing,
    complete,
    bots,
    createNormalOrder,
    createVipOrder,
    addBot,
    removeBot,
  } = OrderController.useOrderController();

  return (
    <DashboardTemplate
      pending={pending}
      processing={processing}
      complete={complete}
      bots={bots}
      onNewNormalOrder={createNormalOrder}
      onNewVipOrder={createVipOrder}
      onAddBot={addBot}
      onRemoveBot={removeBot}
    />
  );
}
