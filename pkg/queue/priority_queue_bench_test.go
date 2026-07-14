package queue

import "testing"

// BenchmarkItems measures the priority-ordered snapshot of a 1k-entry queue,
// the dominant per-call cost of a "status" render. The benchmark name is
// kept stable across implementation changes so benchstat can compare
// before/after.
func BenchmarkItems(b *testing.B) {
	pq := New(func(a, x int) bool { return a < x })
	// Push in a scrambled-ish order so the heap is non-trivial.
	for i := 0; i < 1000; i++ {
		pq.Push((i * 7919) % 1000)
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = pq.Items()
	}
}
