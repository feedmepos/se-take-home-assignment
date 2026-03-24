#!/bin/bash
set -e
node --test tests/orderService.test.js tests/botService.test.js
