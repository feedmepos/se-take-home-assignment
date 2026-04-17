package app

import "testing"

func TestNormalizeInputLineWithChinesePunctuationBackspace(t *testing.T) {
	got := normalizeInputLine("$he，\blp")
	want := "$help"
	if got != want {
		t.Fatalf("normalizeInputLine() = %q, want %q", got, want)
	}
}

func TestNormalizeInputLineWithCaretBackspaceNotation(t *testing.T) {
	got := normalizeInputLine("$he，^Hlp")
	want := "$help"
	if got != want {
		t.Fatalf("normalizeInputLine() = %q, want %q", got, want)
	}
}

func TestNormalizeInputLineWithMixedBackspaces(t *testing.T) {
	got := normalizeInputLine("$he，x\b\blp")
	want := "$help"
	if got != want {
		t.Fatalf("normalizeInputLine() = %q, want %q", got, want)
	}
}
