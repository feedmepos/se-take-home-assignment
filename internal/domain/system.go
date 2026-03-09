package domain

type SystemStatus struct {
	ActiveBots  int      `json:"active_bots"`
	InProcess   int      `json:"in_process"`
	InQueue     int      `json:"in_queue"`
	Completed   int      `json:"completed"`
	LastActions []string `json:"last_actions"`
}
