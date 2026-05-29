import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { OrderController } from '../../controller/OrderController.js';

const controller = new OrderController();
render(<App controller={controller} />);
