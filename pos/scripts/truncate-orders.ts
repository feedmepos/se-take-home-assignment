import { createClient } from '@libsql/client'
import { config } from 'dotenv'
import { createInterface } from 'readline'

config({ path: ['.env.local', '.env'] })

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question('Are you sure you want to truncate the orders table? (yes): ', (answer) => {
  if (answer === 'yes') {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    client.execute('DELETE FROM orders').then(() => {
      console.log('Truncated orders table')
      rl.close()
    })
  } else {
    console.log('Cancelled')
    rl.close()
  }
})
