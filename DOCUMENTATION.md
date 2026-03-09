# 🍔 McDonald's Order Management - System Documentation

Welcome to the **Order Management System**! This document explains how the system works in plain English, designed for Product Managers, Quality Assurance, and Testers.

---

## 🌟 1. System Overview
This is a virtual "automated restaurant" engine. It handles incoming orders, manages a prioritized queue, and controls a workforce of "Worker Bots" that process orders one by one.

### The Problem it Solves:
- Handles hungry customers efficiently.
- Ensures **VIP customers** don't wait as long as normal customers.
- Allows managers to hire/fire workers (bots) instantly to handle busy hours.

---

## 🔄 2. The Core Process (How it Works)

The life of an order follows these simple steps:

1.  **Incoming Order**: A customer places an order (Normal or VIP).
2.  **The Queue**: The order enters the "Pending" list. 
    - **Priority Rule**: Any new **VIP order** automatically jumps ahead of all Normal orders in line.
3.  **Bot Pickup**: If a Worker Bot is free (Idle), it immediately grabs the next order from the front of the queue.
4.  **Cooking (Processing)**: Every order takes exactly **10 seconds** to finish.
5.  **Completion**: The order is marked as "Completed" and logged for history.

---

## 🤖 3. Worker Bots (The Staff)
Worker Bots are our automatic staff members. You can control how many are working at any time (from **0 up to 100**).

- **Hiring (Scaling Up)**: If you increase the bot count, they immediately look for pending orders.
- **Firing (Scaling Down)**: If you reduce the bot count, the bot finishes its current interaction safely. If it was in the middle of an order, it **gives the order back** to the queue so another bot can finish it later. No orders are ever lost!

---

## 📊 4. Monitoring & Tools (Where to look)

We have two main ways to see what's happening:

### A. The Live Dashboard (`manager.log`)
Think of this as the monitor behind the counter. It updates in **real-time** whenever someone places an order or a bot finishes work. It shows:
- How many bots are active.
- Current counts of orders (Waiting vs. Processing vs. Finished).
- The last 10 actions that happened in the system.

### B. Simulation History (`scripts/result.txt`)
This is a detailed log used for testing. It shows exactly when events happened with a `[14:30:05]` timestamp.
- **Use this for QA**: To verify that order A actually finished before order B, or that the 10-second timer is accurate.

---

## 📡 5. Simple API Guide (The Remote Control)

Testers can use these "buttons" (endpoints) to control the system:

| Action | What it does |
| :--- | :--- |
| **Place Order** | Add a new order. Give a name and type (Normal/VIP). |
| **Manage Bots** | Set the "workforce" size (e.g., input `5` to have 5 bots). |
| **Check Menu** | See all orders currently in the system and their status. |
| **View Queue** | See exactly who is waiting in line and in what order. |
| **Bot Status** | See which bots are busy and which are taking a break. |

---

## 🧪 6. How to Test (For QA)

There are two ways we verify the quality:

1.  **Unit Tests**: Internal "logic checks" that ensure the math and priority rules always work. (Run via `scripts/test.sh`)
2.  **Simulation Run**: An automated workflow that simulates a busy lunch rush and records the results for you to audit. (Run via `scripts/run.sh`)

---

*This system is built to be fast, reliable, and fair to our VIPs!* 🍟
