package main

import (
	"testing"
)

func TestAddOrder(t *testing.T) {
	m := NewManager()

	// 1. Add Normal Order
	o1 := m.AddOrder(TypeNormal)
	if len(m.Orders) != 1 {
		t.Errorf("Expected 1 order, got %d", len(m.Orders))
	}
	if o1.Type != TypeNormal {
		t.Errorf("Expected Normal type, got %s", o1.Type)
	}

	// 2. Add VIP Order (should be first if no other VIPs)
	o2 := m.AddOrder(TypeVIP)
	if len(m.Orders) != 2 {
		t.Errorf("Expected 2 orders, got %d", len(m.Orders))
	}
	if m.Orders[0].ID != o2.ID {
		t.Errorf("Expected VIP order to be first")
	}

	// 3. Add another Normal Order (should be last)
	o3 := m.AddOrder(TypeNormal)
	if m.Orders[len(m.Orders)-1].ID != o3.ID {
		t.Errorf("Expected new Normal order to be last")
	}

	// 4. Add another VIP Order (should be after first VIP, before Normals)
	// Current State: [VIP(o2), Normal(o1), Normal(o3)]
	// New VIP should go to index 1
	o4 := m.AddOrder(TypeVIP)
	
	if m.Orders[1].ID != o4.ID {
		t.Errorf("Expected second VIP order to be at index 1")
	}
}

func TestAddBot(t *testing.T) {
	m := NewManager()
	
	b1 := m.AddBot()
	if len(m.Bots) != 1 {
		t.Errorf("Expected 1 bot, got %d", len(m.Bots))
	}
	if b1.Status != BotIdle {
		t.Errorf("Expected bot to be IDLE")
	}
	
	b2 := m.AddBot()
	if b2.ID != b1.ID+1 {
		t.Errorf("Expected bot IDs to increment")
	}
}

func TestRemoveBot(t *testing.T) {
	m := NewManager()
	
	// Add 2 bots
	m.AddBot()
	m.AddBot()
	
	if len(m.Bots) != 2 {
		t.Fatal("Setup failed")
	}
	
	// Remove 1
	m.RemoveBot()
	if len(m.Bots) != 1 {
		t.Errorf("Expected 1 bot, got %d", len(m.Bots))
	}
	
	// Remove 1
	m.RemoveBot()
	if len(m.Bots) != 0 {
		t.Errorf("Expected 0 bots, got %d", len(m.Bots))
	}
	
	// Remove from empty (should not panic)
	m.RemoveBot()
}

func TestBotProcessing(t *testing.T) {
	m := NewManager()
	
	// Add pending order
	m.AddOrder(TypeNormal)
	
	m.AddBot()
}
