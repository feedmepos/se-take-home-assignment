import { Paper, Button, Box, Typography } from '@mui/material'
import { CustomerType } from '../types'

interface OrderFormProps {
  onAddOrder: (customerType: CustomerType) => void
}

export default function OrderForm({ onAddOrder }: OrderFormProps) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Place Order</Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          onClick={() => onAddOrder('NORMAL')}
          fullWidth
        >
          New Normal Order
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => onAddOrder('VIP')}
          fullWidth
        >
          New VIP Order
        </Button>
      </Box>
    </Paper>
  )
}
