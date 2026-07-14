package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

// chdir switches the working directory to dir for the duration of the test
// and restores the original directory on cleanup.
func chdir(t *testing.T, dir string) {
	t.Helper()
	orig, err := os.Getwd()
	if err != nil {
		t.Fatalf("os.Getwd: %v", err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatalf("os.Chdir(%q): %v", dir, err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(orig); err != nil {
			t.Fatalf("restore os.Chdir(%q): %v", orig, err)
		}
	})
}

func TestLoad_DefaultsWhenNothingSet(t *testing.T) {
	chdir(t, t.TempDir()) // empty dir: no .env present, no env var set

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.ProcessingTime != defaultProcessingTime {
		t.Fatalf("ProcessingTime = %v, want default %v", cfg.ProcessingTime, defaultProcessingTime)
	}
}

func TestLoad_EnvVarOverridesDefault(t *testing.T) {
	chdir(t, t.TempDir())
	t.Setenv(envProcessingTimeKey, "250ms")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.ProcessingTime != 250*time.Millisecond {
		t.Fatalf("ProcessingTime = %v, want 250ms", cfg.ProcessingTime)
	}
}

func TestLoad_InvalidEnvDurationReturnsError(t *testing.T) {
	chdir(t, t.TempDir())
	t.Setenv(envProcessingTimeKey, "not-a-duration")

	_, err := Load()
	if err == nil {
		t.Fatal("Load() error = nil, want an error for invalid duration")
	}
}

func TestLoad_InvalidDotEnvDurationReturnsError(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, ".env"), "FEEDME_PROCESSING_TIME=garbage\n")
	chdir(t, dir)

	_, err := Load()
	if err == nil {
		t.Fatal("Load() error = nil, want an error for invalid .env duration")
	}
}

func TestLoad_DotEnvValueUsedWhenNoEnvVar(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, ".env"), "# comment\n\nFEEDME_PROCESSING_TIME=5s\n")
	chdir(t, dir)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.ProcessingTime != 5*time.Second {
		t.Fatalf("ProcessingTime = %v, want 5s", cfg.ProcessingTime)
	}
}

func TestLoad_RealEnvVarBeatsDotEnvValue(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, ".env"), "FEEDME_PROCESSING_TIME=5s\n")
	chdir(t, dir)
	t.Setenv(envProcessingTimeKey, "1s")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}
	if cfg.ProcessingTime != 1*time.Second {
		t.Fatalf("ProcessingTime = %v, want 1s (env var should win over .env)", cfg.ProcessingTime)
	}
}

func TestLoadEnvFile_MissingFileReturnsEmptyMap(t *testing.T) {
	got, err := LoadEnvFile(filepath.Join(t.TempDir(), "does-not-exist.env"))
	if err != nil {
		t.Fatalf("LoadEnvFile() error = %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("LoadEnvFile() = %v, want empty map", got)
	}
}

func TestLoadEnvFile_ParsesCommentsBlankLinesAndQuotes(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	writeFile(t, path, `# this is a comment

FOO=bar
QUOTED="hello world"
SINGLE_QUOTED='single value'
SPACED   =   trimmed
# another comment
BAZ=1
`)

	got, err := LoadEnvFile(path)
	if err != nil {
		t.Fatalf("LoadEnvFile() error = %v", err)
	}

	want := map[string]string{
		"FOO":           "bar",
		"QUOTED":        "hello world",
		"SINGLE_QUOTED": "single value",
		"SPACED":        "trimmed",
		"BAZ":           "1",
	}
	if len(got) != len(want) {
		t.Fatalf("LoadEnvFile() = %v, want %v", got, want)
	}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("LoadEnvFile()[%q] = %q, want %q", k, got[k], v)
		}
	}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("os.WriteFile(%q): %v", path, err)
	}
}
