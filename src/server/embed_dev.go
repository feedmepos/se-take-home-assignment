//go:build !prod

package server

import "io/fs"

// embedFS 开发模式下为 nil，使用本地文件系统
var embedFS fs.FS = nil
