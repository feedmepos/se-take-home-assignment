package botManager

import (
	"mcd/pkg/model/orderManager"
	"testing"
)

func TestNewBotManager(t *testing.T) {
	om := orderManager.NewOrderManager()
	bm := NewBotManager(om)

	if bm == nil {
		t.Errorf("NewBotManager should return a non-nil BotManager")
	}

	if bm.Len() != 0 {
		t.Errorf("Expected initial bot count to be 0, got %d", bm.Len())
	}
}

func TestBotManager_Add(t *testing.T) {
	om := orderManager.NewOrderManager()
	bm := NewBotManager(om)

	initialCount := bm.Len()
	bm.Add()

	if bm.Len() != initialCount+1 {
		t.Errorf("Expected bot count to be %d after Add, got %d", initialCount+1, bm.Len())
	}

	bm.Add()
	if bm.Len() != initialCount+2 {
		t.Errorf("Expected bot count to be %d after second Add, got %d", initialCount+2, bm.Len())
	}
}

func TestBotManager_Del(t *testing.T) {
	om := orderManager.NewOrderManager()
	bm := NewBotManager(om)

	bm.Add()
	bm.Add()

	initialCount := bm.Len()
	bm.Del()

	if bm.Len() != initialCount-1 {
		t.Errorf("Expected bot count to be %d after Del, got %d", initialCount-1, bm.Len())
	}

	bm.Del()
	if bm.Len() != 0 {
		t.Errorf("Expected bot count to be 0 after deleting all bots, got %d", bm.Len())
	}

	bm.Del()
	if bm.Len() != 0 {
		t.Errorf("Expected bot count to remain 0 when deleting from empty manager, got %d", bm.Len())
	}
}

func TestBotManager_Len(t *testing.T) {
	om := orderManager.NewOrderManager()
	bm := NewBotManager(om)

	if bm.Len() != 0 {
		t.Errorf("Expected initial Len() to be 0, got %d", bm.Len())
	}

	bm.Add()
	if bm.Len() != 1 {
		t.Errorf("Expected Len() to be 1 after Add, got %d", bm.Len())
	}

	bm.Add()
	if bm.Len() != 2 {
		t.Errorf("Expected Len() to be 2 after second Add, got %d", bm.Len())
	}

	bm.Del()
	if bm.Len() != 1 {
		t.Errorf("Expected Len() to be 1 after Del, got %d", bm.Len())
	}

	bm.Del()
	if bm.Len() != 0 {
		t.Errorf("Expected Len() to be 0 after deleting all bots, got %d", bm.Len())
	}
}

func TestBotManager_ConcurrentOperations(t *testing.T) {
	om := orderManager.NewOrderManager()
	bm := NewBotManager(om)

	done := make(chan bool)

	go func() {
		for i := 0; i < 10; i++ {
			bm.Add()
		}
		done <- true
	}()

	go func() {
		for i := 0; i < 5; i++ {
			bm.Del()
		}
		done <- true
	}()

	<-done
	<-done

	finalCount := bm.Len()
	if finalCount < 0 || finalCount > 10 {
		t.Errorf("Expected final bot count between 0 and 10, got %d", finalCount)
	}
}
