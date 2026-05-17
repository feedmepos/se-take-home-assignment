package memory

import (
	"sync"
	"testing"

	"github.com/feedme/se-take-home-assignment/internal/domain"
)

func TestMemory_Dequeue_VIPBeforeNormal(t *testing.T) {
	m := NewMemory()
	_, _ = m.CreatePendingOrder(domain.TierNormal)
	_, _ = m.CreatePendingOrder(domain.TierNormal)
	_, _ = m.CreatePendingOrder(domain.TierVIP)

	id, tier, ok := m.DequeueNext()
	if !ok || tier != domain.TierVIP || id == 0 {
		t.Fatalf("want VIP first, got id=%d tier=%v ok=%v", id, tier, ok)
	}
	id2, tier2, ok := m.DequeueNext()
	if !ok || tier2 != domain.TierNormal {
		t.Fatalf("want normal after vip drained, got id=%d tier=%v", id2, tier2)
	}
}

func TestMemory_ListPending_OrderMatchesSlices(t *testing.T) {
	m := NewMemory()
	a, _ := m.CreatePendingOrder(domain.TierNormal)
	b, _ := m.CreatePendingOrder(domain.TierVIP)
	c, _ := m.CreatePendingOrder(domain.TierVIP)
	p := m.ListByStatus(domain.OrderPending)
	if len(p) != 3 {
		t.Fatalf("len pending want 3 got %d", len(p))
	}
	// VIP 整体在前：b, c 然后 a
	if p[0].ID != b.ID || p[1].ID != c.ID || p[2].ID != a.ID {
		t.Fatalf("unexpected order: %#v", idsOf(p))
	}
}

func TestMemory_EnqueuePending_Errors(t *testing.T) {
	m := NewMemory()
	o, err := m.CreatePendingOrder(domain.TierVIP)
	if err != nil {
		t.Fatal(err)
	}
	if err := m.EnqueuePending(domain.TierVIP, o.ID); err != ErrAlreadyQueued {
		t.Fatalf("want ErrAlreadyQueued got %v", err)
	}
	if err := m.EnqueuePending(domain.TierNormal, o.ID); err != ErrTierMismatch {
		t.Fatalf("want ErrTierMismatch got %v", err)
	}
}

func TestMemory_RequeueToPending_AfterCancel(t *testing.T) {
	m := NewMemory()
	o, err := m.CreatePendingOrder(domain.TierNormal)
	if err != nil {
		t.Fatal(err)
	}
	id, _, ok := m.DequeueNext()
	if !ok || id != o.ID {
		t.Fatalf("dequeue")
	}
	oo, err := m.GetOrder(o.ID)
	if err != nil {
		t.Fatal(err)
	}
	if err := oo.CancelProcessingToPending(); err != nil {
		t.Fatal(err)
	}
	m.SaveOrder(oo)
	if err := m.RequeueToPending(o.ID, domain.TierNormal, 0); err != nil {
		t.Fatal(err)
	}
	p := m.ListByStatus(domain.OrderPending)
	if len(p) != 1 || p[0].ID != o.ID || p[0].Status != domain.OrderPending {
		t.Fatalf("requeue pending: %#v", p)
	}
}

func TestMemory_ConcurrentCreate_UniqueIDs(t *testing.T) {
	m := NewMemory()
	const n = 256
	var wg sync.WaitGroup
	ids := make([]domain.OrderID, n)
	var errMu sync.Mutex
	var firstErr error
	wg.Add(n)
	for i := 0; i < n; i++ {
		i := i
		go func() {
			defer wg.Done()
			o, err := m.CreatePendingOrder(domain.TierNormal)
			if err != nil {
				errMu.Lock()
				if firstErr == nil {
					firstErr = err
				}
				errMu.Unlock()
				return
			}
			ids[i] = o.ID
		}()
	}
	wg.Wait()
	if firstErr != nil {
		t.Fatal(firstErr)
	}
	seen := make(map[domain.OrderID]struct{}, n)
	for _, id := range ids {
		if id == 0 {
			t.Fatal("zero order id")
		}
		if _, dup := seen[id]; dup {
			t.Fatalf("duplicate id %d", id)
		}
		seen[id] = struct{}{}
	}
}

func TestMemory_ConcurrentCreateAndDequeue_DeadlockFree(t *testing.T) {
	m := NewMemory()
	var wg sync.WaitGroup
	var errMu sync.Mutex
	var firstErr error
	const creators = 32
	const per = 20
	wg.Add(creators)
	for w := 0; w < creators; w++ {
		go func() {
			defer wg.Done()
			for i := 0; i < per; i++ {
				tier := domain.TierNormal
				if i%3 == 0 {
					tier = domain.TierVIP
				}
				if _, err := m.CreatePendingOrder(tier); err != nil {
					errMu.Lock()
					if firstErr == nil {
						firstErr = err
					}
					errMu.Unlock()
					return
				}
			}
		}()
	}
	wg.Wait()
	if firstErr != nil {
		t.Fatal(firstErr)
	}
	var drained int
	for {
		_, _, ok := m.DequeueNext()
		if !ok {
			break
		}
		drained++
	}
	if drained != creators*per {
		t.Fatalf("want drained %d got %d", creators*per, drained)
	}
}

func idsOf(orders []*domain.Order) []domain.OrderID {
	out := make([]domain.OrderID, len(orders))
	for i, o := range orders {
		out[i] = o.ID
	}
	return out
}
