import { Grid, Paper, Typography, Box } from '@mui/material'
import { Order } from '../types'
import OrderCard from './OrderCard'

interface OrderBoardProps {
  orders: Order[]
}

export default function OrderBoard({ orders }: OrderBoardProps) {
  const pending = orders
    .filter(o => o.status === 'PENDING' || o.status === 'PROCESSING')
    .sort((a, b) => {
      if (a.customerType === 'VIP' && b.customerType === 'NORMAL') return -1
      if (a.customerType === 'NORMAL' && b.customerType === 'VIP') return 1
      return a.submitTime - b.submitTime
    })
  const complete = orders.filter(o => o.status === 'COMPLETE')

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, minHeight: 400 }}>
          <Typography variant="h6" gutterBottom>
            PENDING ({pending.length})
          </Typography>
          <Box>
            {pending.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, minHeight: 400 }}>
          <Typography variant="h6" gutterBottom>
            COMPLETE ({complete.length})
          </Typography>
          <Box>
            {complete.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  )
}
