package cli

import "os"

// openFile 打开批处理脚本文件。
func openFile(path string) (*os.File, error) {
	return os.Open(path)
}
