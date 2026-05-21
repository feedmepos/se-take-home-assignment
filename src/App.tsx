import { Container, Box, Typography } from '@mui/material'
import OrderForm from './components/OrderForm'
import OrderBoard from './components/OrderBoard'
import BotManager from './components/BotManager'
import { useOrderQueue } from './hooks/useOrderQueue'

function App() {
  const { orders, bots, addOrder, addBot, removeBot } = useOrderQueue()

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          McDonald's Ordering System
        </Typography>
        <OrderForm onAddOrder={addOrder} />
        <BotManager 
          bots={bots}
          onAddBot={addBot}
          onRemoveBot={removeBot}
        />
        <OrderBoard orders={orders} />
      </Box>
    </Container>
  )
}

export default App
