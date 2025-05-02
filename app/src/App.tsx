import React from 'react';
import './App.css';
import OrderSystem from './components/OrderSystem';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>McDonald's Order Processing System</h1>
        <p>Automated Cooking Bots Management</p>
      </header>
      <main>
        <OrderSystem />
      </main>
      <footer>
        <p>FeedMe Software Engineer Take Home Assignment</p>
      </footer>
    </div>
  );
}

export default App;
