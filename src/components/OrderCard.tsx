import { Card, CardContent, Typography, Chip, Box } from '@mui/material'
import { Order } from '../types'

interface OrderCardProps {
  order: Order
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

export default function OrderCard({ order }: OrderCardProps) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            Order #{order.id}
          </Typography>
          <Chip 
            label={order.customerType} 
            size="small"
            color={order.customerType === 'VIP' ? 'primary' : 'default'}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Submit: {formatTime(order.submitTime)}
        </Typography>
        {order.completeTime && (
          <Typography variant="body2" color="text.secondary">
            Complete: {formatTime(order.completeTime)}
          </Typography>
        )}
        {order.botId && (
          <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
            Processing by Bot #{order.botId}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
