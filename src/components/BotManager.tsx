import { Paper, Typography, Box, Button, Chip } from '@mui/material'
import { Bot } from '../types'

interface BotManagerProps {
  bots: Bot[]
  onAddBot: () => void
  onRemoveBot: () => void
}

export default function BotManager({ bots, onAddBot, onRemoveBot }: BotManagerProps) {
  const idleBots = bots.filter(b => b.status === 'IDLE').length
  const processingBots = bots.filter(b => b.status === 'PROCESSING').length

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Bot Manager</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button 
          variant="contained" 
          onClick={onAddBot}
        >
          + Bot
        </Button>
        <Button 
          variant="outlined" 
          onClick={onRemoveBot}
          disabled={bots.length === 0}
        >
          - Bot
        </Button>
        <Typography variant="body1">
          Total: {bots.length}
        </Typography>
        <Chip label={`IDLE: ${idleBots}`} color="default" />
        <Chip label={`PROCESSING: ${processingBots}`} color="primary" />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {bots.map(bot => (
          <Chip
            key={bot.id}
            label={`Bot #${bot.id}: ${bot.status}${bot.orderId ? ` (Order #${bot.orderId})` : ''}`}
            color={bot.status === 'PROCESSING' ? 'primary' : 'default'}
            variant={bot.status === 'PROCESSING' ? 'filled' : 'outlined'}
          />
        ))}
      </Box>
    </Paper>
  )
}
