import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Bot } from '../types';
import { getBots, addBot, removeBot } from '../services/api';
import { useOrderEvents } from '../hooks/useOrderEvents';
import BotControls from '../components/BotControls';
import BotCard from '../components/BotCard';

export default function BotListPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: bots = [], isError, error: queryError } = useQuery<Bot[]>({
    queryKey: ['bots'],
    queryFn: getBots,
  });

  const addBotMutation = useMutation({
    mutationFn: addBot,
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['bots'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const removeBotMutation = useMutation({
    mutationFn: removeBot,
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['bots'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  useOrderEvents((event) => {
    if (event.event === 'bot:status_changed') {
      const { botId, status, currentOrderId } = event.payload as {
        botId: number;
        status: 'IDLE' | 'PROCESSING';
        currentOrderId?: number;
      };
      queryClient.setQueryData<Bot[]>(['bots'], (prev) =>
        (prev ?? []).map((b) =>
          b.id === botId ? { ...b, status, currentOrderId } : b,
        ),
      );
    }
  });

  if (isError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
        加载 Bot 列表失败: {(queryError as Error)?.message || '未知错误'}
      </div>
    );
  }

  return (
    <div>
      <BotControls
        onAdd={() => addBotMutation.mutate()}
        onRemove={() => removeBotMutation.mutate()}
        disabled={addBotMutation.isPending || removeBotMutation.isPending}
      />
      {error && (
        <div style={{ padding: '8px 16px', marginBottom: '12px', background: '#ffebee', color: '#d32f2f', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      {bots.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic' }}>暂无机器人，请点击 "+ Bot" 创建</p>
      ) : (
        bots.map((bot) => <BotCard key={bot.id} bot={bot} />)
      )}
    </div>
  );
}
