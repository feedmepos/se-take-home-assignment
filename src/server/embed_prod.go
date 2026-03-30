//go:build prod

package server

import "io/fs"

// embedFS 在 prod 构建时通过 Makefile 复制 webui/dist 到 src/frontend/dist 后嵌入
// 由于 go:embed 不支持 .. 路径，此文件需配合构建流程
var embedFS fs.FS = nil
