package controller

import (
	"context"
	"errors"
	"sync"
	"time"
)

type ClientRequestType int

const (
	ClientCreateNormalOrder ClientRequestType = iota
	ClientCreateVIPOrder
	ClientStatus
	ClientSummary
)

type ManagerRequestType int

const (
	ManagerAddBot ManagerRequestType = iota
	ManagerRemoveBot
)

type SystemRequestType int

const (
	SystemInitialize SystemRequestType = iota
)

type ClientRequest struct {
	Type ClientRequestType
	At   time.Time
}

type ManagerRequest struct {
	Type ManagerRequestType
	At   time.Time
}

type SystemRequest struct {
	Type SystemRequestType
	At   time.Time
}

type Response struct {
	Logs     []LogEntry
	Snapshot Snapshot
}

type WorkAssignment struct {
	BotID   int
	OrderID int
	Kind    OrderKind
}

type Service struct {
	clientRequests  chan clientServiceRequest
	managerRequests chan managerServiceRequest
	systemRequests  chan systemServiceRequest
	botEvents       chan botEvent
	logs            chan []LogEntry
	stop            chan struct{}
	done            chan struct{}

	workers   map[int]*botWorker
	closeOnce sync.Once
}

type clientServiceRequest struct {
	request ClientRequest
	reply   chan Response
}

type managerServiceRequest struct {
	request ManagerRequest
	reply   chan Response
}

type systemServiceRequest struct {
	request SystemRequest
	reply   chan Response
}

func StartService() *Service {
	s := &Service{
		clientRequests:  make(chan clientServiceRequest),
		managerRequests: make(chan managerServiceRequest),
		systemRequests:  make(chan systemServiceRequest),
		botEvents:       make(chan botEvent, 32),
		logs:            make(chan []LogEntry, 64),
		stop:            make(chan struct{}),
		done:            make(chan struct{}),
		workers:         make(map[int]*botWorker),
	}

	go s.run()
	return s
}

func (s *Service) Logs() <-chan []LogEntry {
	return s.logs
}

func (s *Service) HandleClientRequest(ctx context.Context, request ClientRequest) (Response, error) {
	if request.At.IsZero() {
		request.At = time.Now()
	}

	serviceRequest := clientServiceRequest{
		request: request,
		reply:   make(chan Response, 1),
	}

	select {
	case s.clientRequests <- serviceRequest:
	case <-s.done:
		return Response{}, errors.New("order controller service is closed")
	case <-ctx.Done():
		return Response{}, ctx.Err()
	}

	return waitForResponse(ctx, s.done, serviceRequest.reply)
}

func (s *Service) HandleManagerRequest(ctx context.Context, request ManagerRequest) (Response, error) {
	if request.At.IsZero() {
		request.At = time.Now()
	}

	serviceRequest := managerServiceRequest{
		request: request,
		reply:   make(chan Response, 1),
	}

	select {
	case s.managerRequests <- serviceRequest:
	case <-s.done:
		return Response{}, errors.New("order controller service is closed")
	case <-ctx.Done():
		return Response{}, ctx.Err()
	}

	return waitForResponse(ctx, s.done, serviceRequest.reply)
}

func (s *Service) HandleSystemRequest(ctx context.Context, request SystemRequest) (Response, error) {
	if request.At.IsZero() {
		request.At = time.Now()
	}

	serviceRequest := systemServiceRequest{
		request: request,
		reply:   make(chan Response, 1),
	}

	select {
	case s.systemRequests <- serviceRequest:
	case <-s.done:
		return Response{}, errors.New("order controller service is closed")
	case <-ctx.Done():
		return Response{}, ctx.Err()
	}

	return waitForResponse(ctx, s.done, serviceRequest.reply)
}

func (s *Service) Close() {
	s.closeOnce.Do(func() {
		close(s.stop)
		<-s.done
	})
}

func (s *Service) run() {
	controller := New()
	defer func() {
		close(s.logs)
		close(s.done)
	}()

	for {
		select {
		case request := <-s.clientRequests:
			logs := s.applyClientRequest(controller, request.request)
			request.reply <- responseFor(controller, logs)
			if isCreateOrderRequest(request.request) {
				s.publishLogs(s.assignIdleBots(controller, request.request.At))
			}
		case request := <-s.managerRequests:
			logs := s.applyManagerRequest(controller, request.request)
			request.reply <- responseFor(controller, logs)
		case request := <-s.systemRequests:
			logs := s.applySystemRequest(controller, request.request)
			request.reply <- responseFor(controller, logs)
		case event := <-s.botEvents:
			s.applyBotEvent(controller, event)
		case <-s.stop:
			s.stopAllWorkers()
			return
		}
	}
}

func (s *Service) applyClientRequest(controller *Controller, request ClientRequest) []LogEntry {
	switch request.Type {
	case ClientCreateNormalOrder:
		return controller.AddOrder(NormalOrder, request.At)
	case ClientCreateVIPOrder:
		return controller.AddOrder(VIPOrder, request.At)
	case ClientStatus:
		return controller.Status(request.At)
	case ClientSummary:
		return controller.Summary(request.At)
	default:
		return []LogEntry{controller.log(request.At, "Unknown client request")}
	}
}

func isCreateOrderRequest(request ClientRequest) bool {
	return request.Type == ClientCreateNormalOrder || request.Type == ClientCreateVIPOrder
}

func (s *Service) applyManagerRequest(controller *Controller, request ManagerRequest) []LogEntry {
	switch request.Type {
	case ManagerAddBot:
		botID, logs := controller.AddBot(request.At)
		s.startWorker(botID)
		logs = append(logs, s.assignBot(controller, botID, request.At)...)
		return logs
	case ManagerRemoveBot:
		botID, _, logs := controller.RemoveNewestBot(request.At)
		s.stopWorker(botID)
		return logs
	default:
		return []LogEntry{controller.log(request.At, "Unknown manager request")}
	}
}

func (s *Service) applySystemRequest(controller *Controller, request SystemRequest) []LogEntry {
	switch request.Type {
	case SystemInitialize:
		return controller.Initialized(request.At)
	default:
		return []LogEntry{controller.log(request.At, "Unknown system request")}
	}
}

func (s *Service) applyBotEvent(controller *Controller, event botEvent) {
	switch event.Type {
	case botEventCompleted:
		next, logs := controller.CompleteOrder(event.BotID, event.OrderID, event.At, event.Duration)
		s.publishLogs(logs)
		if next != nil {
			s.publishLogs(s.sendWork(controller, *next, event.At))
		}
		s.publishLogs(s.assignIdleBots(controller, event.At))
	case botEventCanceled:
		logs, canceled := controller.CancelOrder(event.BotID, event.OrderID, event.At, event.Duration)
		s.publishLogs(logs)
		if canceled {
			s.publishLogs(s.assignIdleBots(controller, event.At))
		}
	}
}

func (s *Service) publishLogs(logs []LogEntry) {
	if len(logs) == 0 {
		return
	}
	select {
	case s.logs <- logs:
	default:
	}
}

func (s *Service) assignIdleBots(controller *Controller, now time.Time) []LogEntry {
	var logs []LogEntry
	for _, botID := range controller.idleBotIDs() {
		logs = append(logs, s.assignBot(controller, botID, now)...)
	}
	return logs
}

func (s *Service) assignBot(controller *Controller, botID int, now time.Time) []LogEntry {
	assignment, logs := controller.AssignNextOrder(botID, now)
	if assignment == nil {
		return logs
	}

	if sendLogs := s.sendWork(controller, *assignment, now); len(sendLogs) > 0 {
		logs = append(logs, sendLogs...)
	}
	return logs
}

func (s *Service) startWorker(botID int) {
	worker := newBotWorker(botID, s.botEvents)
	s.workers[botID] = worker
	worker.start()
}

func (s *Service) stopWorker(botID int) {
	worker := s.workers[botID]
	if worker == nil {
		return
	}
	worker.stop()
	delete(s.workers, botID)
}

func (s *Service) stopAllWorkers() {
	for botID := range s.workers {
		s.stopWorker(botID)
	}
}

func (s *Service) sendWork(controller *Controller, assignment WorkAssignment, now time.Time) []LogEntry {
	worker := s.workers[assignment.BotID]
	if worker == nil {
		return controller.ReturnAssignedOrder(assignment, now)
	}
	if !worker.assign(assignment) {
		return controller.ReturnAssignedOrder(assignment, now)
	}
	return nil
}

func waitForResponse(ctx context.Context, done <-chan struct{}, reply <-chan Response) (Response, error) {
	select {
	case response := <-reply:
		return response, nil
	case <-done:
		return Response{}, errors.New("order controller service is closed")
	case <-ctx.Done():
		return Response{}, ctx.Err()
	}
}

func responseFor(controller *Controller, logs []LogEntry) Response {
	return Response{
		Logs:     logs,
		Snapshot: controller.Snapshot(),
	}
}
