package controller

import (
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEnqueue_Normal(t *testing.T) {
	q := NewOrderQueue()
	order := &Order{ID: 1000, Type: OrderNormal}
	q.Enqueue(order)

	vip, normal := q.Len()
	assert.Equal(t, 0, vip)
	assert.Equal(t, 1, normal)
}

func TestEnqueue_VIP(t *testing.T) {
	q := NewOrderQueue()
	order := &Order{ID: 1000, Type: OrderVIP}
	q.Enqueue(order)

	vip, normal := q.Len()
	assert.Equal(t, 1, vip)
	assert.Equal(t, 0, normal)
}

func TestDequeue_VIPFirst(t *testing.T) {
	q := NewOrderQueue()

	q.Enqueue(&Order{ID: 1000, Type: OrderNormal})
	q.Enqueue(&Order{ID: 1001, Type: OrderVIP})

	// VIP 优先出队
	got := q.Dequeue()
	assert.Equal(t, 1001, got.ID)
	assert.Equal(t, OrderVIP, got.Type)

	got = q.Dequeue()
	assert.Equal(t, 1000, got.ID)
	assert.Equal(t, OrderNormal, got.Type)
}

func TestDequeue_NormalFallback(t *testing.T) {
	q := NewOrderQueue()
	q.Enqueue(&Order{ID: 1000, Type: OrderNormal})

	got := q.Dequeue()
	assert.Equal(t, 1000, got.ID)
	assert.Equal(t, OrderNormal, got.Type)
}

func TestDequeue_Empty(t *testing.T) {
	q := NewOrderQueue()
	got := q.Dequeue()
	assert.Nil(t, got)
}

func TestReturn_ToCorrectQueue(t *testing.T) {
	q := NewOrderQueue()

	q.Enqueue(&Order{ID: 1000, Type: OrderNormal})
	q.Enqueue(&Order{ID: 1001, Type: OrderVIP})
	q.Enqueue(&Order{ID: 1002, Type: OrderNormal})

	// 取走 #1001 VIP
	vip := q.Dequeue()
	assert.Equal(t, 1001, vip.ID)

	// 取走 #1000 Normal
	normal := q.Dequeue()
	assert.Equal(t, 1000, normal.ID)

	// 此时 VIP 队列空，Normal 队列有 #1002
	// 回退 VIP 订单
	q.Return(vip)

	vipLen, normalLen := q.Len()
	assert.Equal(t, 1, vipLen)
	assert.Equal(t, 1, normalLen)

	// VIP 应该先出队
	got := q.Dequeue()
	assert.Equal(t, 1001, got.ID)
	assert.Equal(t, OrderVIP, got.Type)
}

func TestReturn_MaintainsOrder(t *testing.T) {
	q := NewOrderQueue()

	q.Enqueue(&Order{ID: 1000, Type: OrderNormal})
	q.Enqueue(&Order{ID: 1002, Type: OrderNormal})
	q.Enqueue(&Order{ID: 1004, Type: OrderNormal})

	// 取走 #1000
	q.Dequeue()
	// 取走 #1002
	order1002 := q.Dequeue()

	// 此时只有 #1004
	// 新订单进来
	q.Enqueue(&Order{ID: 1005, Type: OrderNormal})

	// #1002 回退
	q.Return(order1002)

	// 验证顺序: 1002 → 1004 → 1005
	all := q.AllPending()
	assert.Equal(t, 3, len(all))
	assert.Equal(t, 1002, all[0].ID)
	assert.Equal(t, 1004, all[1].ID)
	assert.Equal(t, 1005, all[2].ID)
}

func TestReturn_VIPOrderAmongExisting(t *testing.T) {
	q := NewOrderQueue()

	q.Enqueue(&Order{ID: 1001, Type: OrderVIP})
	q.Enqueue(&Order{ID: 1003, Type: OrderVIP})
	q.Enqueue(&Order{ID: 1005, Type: OrderVIP})

	// 取走 #1001
	q.Dequeue()
	// 取走 #1003
	order1003 := q.Dequeue()
	// 此时 VIP 队列只有 #1005

	// 回退 #1003，应该排在 #1005 前面
	q.Return(order1003)

	all := q.AllPending()
	assert.Equal(t, 2, len(all))
	assert.Equal(t, 1003, all[0].ID)
	assert.Equal(t, 1005, all[1].ID)
}

func TestAllPending_VIPBeforeNormal(t *testing.T) {
	q := NewOrderQueue()

	q.Enqueue(&Order{ID: 1001, Type: OrderNormal})
	q.Enqueue(&Order{ID: 1002, Type: OrderVIP})
	q.Enqueue(&Order{ID: 1003, Type: OrderNormal})
	q.Enqueue(&Order{ID: 1004, Type: OrderVIP})

	all := q.AllPending()
	assert.Equal(t, 4, len(all))
	// VIP 在前
	assert.Equal(t, OrderVIP, all[0].Type)
	assert.Equal(t, OrderVIP, all[1].Type)
	// Normal 在后
	assert.Equal(t, OrderNormal, all[2].Type)
	assert.Equal(t, OrderNormal, all[3].Type)
}

func TestConcurrentAccess(t *testing.T) {
	q := NewOrderQueue()
	var wg sync.WaitGroup

	// 并发入队
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			orderType := OrderNormal
			if id%2 == 0 {
				orderType = OrderVIP
			}
			q.Enqueue(&Order{ID: 1000 + id, Type: orderType})
		}(i)
	}

	wg.Wait()

	vip, normal := q.Len()
	assert.Equal(t, 50, vip)   // 偶数 ID 是 VIP
	assert.Equal(t, 50, normal) // 奇数 ID 是 Normal
}
