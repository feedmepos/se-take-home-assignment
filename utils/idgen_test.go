package utils

import (
	"sync"
	"testing"
)

// TestNewIDGenerator 测试创建新的 ID 生成器
func TestNewIDGenerator(t *testing.T) {
	gen := New(1001)
	if gen == nil {
		t.Fatal("expected non-nil IDGenerator")
	}
	if gen.next != 1001 {
		t.Errorf("expected start value 1001, got %d", gen.next)
	}
}

// TestNext 测试基本的 ID 自增
func TestNext(t *testing.T) {
	gen := New(1)

	id1 := gen.Next()
	id2 := gen.Next()
	id3 := gen.Next()

	if id1 != 1 {
		t.Errorf("expected first ID 1, got %d", id1)
	}
	if id2 != 2 {
		t.Errorf("expected second ID 2, got %d", id2)
	}
	if id3 != 3 {
		t.Errorf("expected third ID 3, got %d", id3)
	}
}

// TestNextFromCustomStart 测试从自定义起始值开始
func TestNextFromCustomStart(t *testing.T) {
	gen := New(100)

	id1 := gen.Next()
	id2 := gen.Next()

	if id1 != 100 {
		t.Errorf("expected ID 100, got %d", id1)
	}
	if id2 != 101 {
		t.Errorf("expected ID 101, got %d", id2)
	}
}

// TestNextSequence 测试连续生成多个 ID
func TestNextSequence(t *testing.T) {
	gen := New(0)
	expected := []int{0, 1, 2, 3, 4, 5, 6, 7, 8, 9}

	for i, exp := range expected {
		id := gen.Next()
		if id != exp {
			t.Errorf("at index %d: expected ID %d, got %d", i, exp, id)
		}
	}
}

// TestNextConcurrency 测试并发生成 ID（检查竞态和唯一性）
func TestNextConcurrency(t *testing.T) {
	gen := New(0)
	const goroutines = 100
	const idsPerGoroutine = 100

	var wg sync.WaitGroup
	ids := make(chan int, goroutines*idsPerGoroutine)

	for range goroutines {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < idsPerGoroutine; j++ {
				ids <- gen.Next()
			}
		}()
	}

	wg.Wait()
	close(ids)

	// 检查唯一性
	seen := make(map[int]bool)
	total := 0
	for id := range ids {
		if seen[id] {
			t.Errorf("duplicate ID found: %d", id)
		}
		seen[id] = true
		total++
	}

	expectedTotal := goroutines * idsPerGoroutine
	if total != expectedTotal {
		t.Errorf("expected %d IDs, got %d", expectedTotal, total)
	}

	// 检查连续性：所有 ID 应覆盖 0 到 expectedTotal-1
	for i := 0; i < expectedTotal; i++ {
		if !seen[i] {
			t.Errorf("missing ID: %d", i)
		}
	}
}

// TestNextWithMultipleGenerators 测试多个生成器独立工作
func TestNextWithMultipleGenerators(t *testing.T) {
	gen1 := New(1001) // 模拟订单 ID 生成器
	gen2 := New(1)    // 模拟 Bot ID 生成器

	if gen1.Next() != 1001 {
		t.Error("gen1 first ID should be 1001")
	}
	if gen2.Next() != 1 {
		t.Error("gen2 first ID should be 1")
	}
	if gen1.Next() != 1002 {
		t.Error("gen1 second ID should be 1002")
	}
	if gen2.Next() != 2 {
		t.Error("gen2 second ID should be 2")
	}
}
