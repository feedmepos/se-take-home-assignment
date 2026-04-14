package pack

import "embed"

// Web 静态资源根（开发占位 + Vite build 输出目录 webdist）。
//
//go:embed all:webdist
var Web embed.FS
