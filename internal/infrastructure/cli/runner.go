package cli

import (
	"bufio"
	"fmt"
	"io"
	"strings"

	app "github.com/lijian-bj/se-take-home-assignment/internal/application/ordercontroller"
)

// Execute 解析并执行单行命令，返回 (是否退出, 错误)。
func Execute(svc *app.Service, line string) (bool, error) {
	cmd, err := Parse(line)
	if err != nil {
		return false, err
	}

	switch cmd {
	case CmdNormal:
		_, err = svc.CreateNormalOrder()
	case CmdVIP:
		_, err = svc.CreateVIPOrder()
	case CmdAddBot:
		_, err = svc.AddBot()
	case CmdRemoveBot:
		err = svc.RemoveBot()
	case CmdStatus:
		svc.LogStatus()
	case CmdWait:
		d, parseErr := ParseWaitDuration(line)
		if parseErr != nil {
			return false, parseErr
		}
		err = svc.WaitUntilIdle(d)
	case CmdQuit:
		return true, nil
	default:
		return false, fmt.Errorf("unknown command: %s", line)
	}
	return false, err
}

// RunREPL 启动交互式 REPL，逐行读取命令直到 quit 或 EOF。
func RunREPL(svc *app.Service, in io.Reader, out io.Writer) error {
	scanner := bufio.NewScanner(in)
	for {
		fmt.Fprint(out, "> ")
		if !scanner.Scan() {
			return nil
		}
		quit, err := Execute(svc, scanner.Text())
		if err != nil {
			fmt.Fprintf(out, "error: %v\n", err)
			continue
		}
		if quit {
			return nil
		}
	}
}

// RunBatch 从脚本文件逐行执行命令，忽略空行与 # 注释。
func RunBatch(svc *app.Service, path string) error {
	f, err := openFile(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return runLines(svc, bufio.NewScanner(f))
}

// RunBatchReader 从 io.Reader（如 stdin 管道）逐行执行命令。
func RunBatchReader(svc *app.Service, in io.Reader) error {
	return runLines(svc, bufio.NewScanner(in))
}

// runLines 逐行扫描并执行命令，遇 quit 提前结束。
func runLines(svc *app.Service, scanner *bufio.Scanner) error {
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		quit, err := Execute(svc, line)
		if err != nil {
			return fmt.Errorf("executing %q: %w", line, err)
		}
		if quit {
			break
		}
	}
	return scanner.Err()
}
