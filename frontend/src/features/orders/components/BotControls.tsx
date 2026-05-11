import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Bot } from "../types";

interface BotControlsProps {
  bots: Bot[];
  onAddBot: () => void;
  onRemoveBot: () => void;
}

export function BotControls({ bots, onAddBot, onRemoveBot }: BotControlsProps) {
  return (
    <>
      <div className="flex items-center gap-2 shrink-0 mb-2">
        <Button size="sm" onClick={onAddBot} data-testid="add-bot">
          + Bot
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRemoveBot}
          disabled={bots.length === 0}
          data-testid="remove-bot"
        >
          - Bot
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {bots.length} bot{bots.length !== 1 && "s"}
        </span>
      </div>
      {bots.length > 0 && (
        <div className="space-y-2 overflow-y-auto min-h-0 flex-1" data-testid="bot-list">
          {bots.map((bot) => {
            const isProcessing = bot.status === "PROCESSING";
            return (
              <Card
                key={bot.id}
                size="sm"
                className={cn(
                  "h-10",
                  isProcessing ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-gray-50"
                )}
                data-testid={`bot-${bot.id}`}
              >
                <CardContent className="flex items-center gap-3 py-0">
                  <span
                    className={cn(
                      "inline-block size-2 rounded-full",
                      isProcessing ? "bg-blue-500 animate-pulse" : "bg-gray-400"
                    )}
                  />
                  <span className="font-medium text-sm">Bot #{bot.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {bot.order
                      ? `Processing Order #${bot.order.id}`
                      : "Idle — waiting for orders"}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
