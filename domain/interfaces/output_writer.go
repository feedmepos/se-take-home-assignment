package interfaces

type OutputWriter interface {
	WriteLine(line string) error
	Flush() error
}
