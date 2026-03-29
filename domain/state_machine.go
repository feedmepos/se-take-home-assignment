package domain

// StateMachine 状态机接口
type StateMachine interface {
	CurrentState() string
	HandleEvent(event string, args ...interface{}) error
	CanHandleEvent(event string) bool
}

// FSM 有限状态机实现
type FSM struct {
	currentState string
	states       map[string]bool
	events       map[string]bool
	transitions  map[string]map[string]string // fromState -> event -> toState
}

// NewFSM 创建新的状态机
func NewFSM(initialState string) *FSM {
	return &FSM{
		currentState: initialState,
		states:       make(map[string]bool),
		events:       make(map[string]bool),
		transitions:  make(map[string]map[string]string),
	}
}

// AddState 添加状态
func (fsm *FSM) AddState(state string) {
	fsm.states[state] = true
}

// AddEvent 添加事件
func (fsm *FSM) AddEvent(event string) {
	fsm.events[event] = true
}

// AddTransition 添加状态转换
func (fsm *FSM) AddTransition(fromState, event, toState string) {
	if fsm.transitions[fromState] == nil {
		fsm.transitions[fromState] = make(map[string]string)
	}
	fsm.transitions[fromState][event] = toState
	fsm.states[fromState] = true
	fsm.states[toState] = true
	fsm.events[event] = true
}

// CurrentState 获取当前状态
func (fsm *FSM) CurrentState() string {
	return fsm.currentState
}

// HandleEvent 处理事件
func (fsm *FSM) HandleEvent(event string, args ...interface{}) error {
	if !fsm.events[event] {
		return nil
	}

	toState, ok := fsm.transitions[fsm.currentState][event]
	if !ok {
		return nil
	}

	fsm.currentState = toState
	return nil
}

// CanHandleEvent 检查是否可以处理事件
func (fsm *FSM) CanHandleEvent(event string) bool {
	_, ok := fsm.transitions[fsm.currentState][event]
	return ok
}

// NewBotFSM 创建机器人状态机
func NewBotFSM() *FSM {
	fsm := NewFSM("idle")
	fsm.AddState("idle")
	fsm.AddState("processing")
	fsm.AddState("error")
	fsm.AddEvent("assign")
	fsm.AddEvent("complete")
	fsm.AddEvent("error")
	fsm.AddEvent("recover")
	fsm.AddTransition("idle", "assign", "processing")
	fsm.AddTransition("processing", "complete", "idle")
	fsm.AddTransition("processing", "error", "error")
	fsm.AddTransition("error", "recover", "idle")
	return fsm
}

// NewOrderFSM 创建订单状态机
func NewOrderFSM() *FSM {
	fsm := NewFSM("pending")
	fsm.AddState("pending")
	fsm.AddState("processing")
	fsm.AddState("complete")
	fsm.AddState("cancelled")
	fsm.AddState("error")
	fsm.AddEvent("assign")
	fsm.AddEvent("complete")
	fsm.AddEvent("cancel")
	fsm.AddEvent("fail")
	fsm.AddEvent("retry")
	fsm.AddTransition("pending", "assign", "processing")
	fsm.AddTransition("processing", "complete", "complete")
	fsm.AddTransition("pending", "cancel", "cancelled")
	fsm.AddTransition("processing", "cancel", "cancelled")
	fsm.AddTransition("processing", "fail", "error")
	fsm.AddTransition("error", "retry", "pending")
	return fsm
}
