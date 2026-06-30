package controller

import (
	"context"
	"fmt"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestClientOrderRequestReturnsPendingBeforeWorkerStarts(t *testing.T) {
	now := testTime()
	service := StartService()
	defer service.Close()

	if _, err := service.HandleManagerRequest(context.Background(), ManagerRequest{Type: ManagerAddBot, At: now}); err != nil {
		t.Fatalf("add bot request returned error: %v", err)
	}

	response, err := service.HandleClientRequest(context.Background(), ClientRequest{Type: ClientCreateNormalOrder, At: now.Add(time.Second)})
	if err != nil {
		t.Fatalf("normal order request returned error: %v", err)
	}

	if got, want := orderIDs(response.Snapshot.Pending), []int{1001}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs in client response = %v, want %v", got, want)
	}
	if response.Snapshot.Bots[0].Status != BotIdle {
		t.Fatalf("bot status in client response = %s, want %s", response.Snapshot.Bots[0].Status, BotIdle)
	}
}

func TestBotWorkerCompletesOrderAndContinues(t *testing.T) {
	now := testTime()
	service := StartService()
	defer service.Close()

	mustClient(t, service, ClientCreateNormalOrder, now)
	mustClient(t, service, ClientCreateNormalOrder, now)
	mustManager(t, service, ManagerAddBot, now)

	waitForCompletedLog(t, service, 1001)
	waitForCompletedLog(t, service, 1002)

	response, err := service.HandleClientRequest(context.Background(), ClientRequest{Type: ClientStatus, At: now})
	if err != nil {
		t.Fatalf("status request returned error: %v", err)
	}
	if got, want := orderIDs(response.Snapshot.Completed), []int{1001, 1002}; !reflect.DeepEqual(got, want) {
		t.Fatalf("completed order IDs = %v, want %v", got, want)
	}
	if response.Snapshot.Bots[0].Status != BotIdle {
		t.Fatalf("bot status = %s, want %s", response.Snapshot.Bots[0].Status, BotIdle)
	}
}

func TestVIPOrderIsProcessedBeforeNormalOrder(t *testing.T) {
	now := testTime()
	service := StartService()
	defer service.Close()

	mustClient(t, service, ClientCreateNormalOrder, now)
	mustClient(t, service, ClientCreateVIPOrder, now)
	mustManager(t, service, ManagerAddBot, now)

	waitForCompletedLog(t, service, 1002)
	waitForCompletedLog(t, service, 1001)
}

func TestRemoveProcessingBotCancelsWorkerAndReturnsOrder(t *testing.T) {
	now := testTime()
	service := StartService()
	defer service.Close()

	mustClient(t, service, ClientCreateNormalOrder, now)
	response, err := service.HandleManagerRequest(context.Background(), ManagerRequest{Type: ManagerAddBot, At: now})
	if err != nil {
		t.Fatalf("add bot request returned error: %v", err)
	}
	if got, want := orderIDs(response.Snapshot.Processing), []int{1001}; !reflect.DeepEqual(got, want) {
		t.Fatalf("processing order IDs after add bot = %v, want %v", got, want)
	}

	response, err = service.HandleManagerRequest(context.Background(), ManagerRequest{Type: ManagerRemoveBot, At: now.Add(time.Millisecond)})
	if err != nil {
		t.Fatalf("remove bot request returned error: %v", err)
	}
	if len(response.Snapshot.Bots) != 0 {
		t.Fatalf("active bots after remove request = %v, want none", response.Snapshot.Bots)
	}
	if got, want := orderIDs(response.Snapshot.Pending), []int{}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs before cancel event = %v, want %v", got, want)
	}

	waitForCanceledLog(t, service, 1001)
	response, err = service.HandleClientRequest(context.Background(), ClientRequest{Type: ClientStatus, At: now})
	if err != nil {
		t.Fatalf("status request returned error: %v", err)
	}
	if got, want := orderIDs(response.Snapshot.Pending), []int{1001}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs after cancel event = %v, want %v", got, want)
	}
	if len(response.Snapshot.Bots) != 0 {
		t.Fatalf("active bots after cancel event = %v, want none", response.Snapshot.Bots)
	}

	assertNoCompletedLog(t, service, 1001, 120*time.Millisecond)
}

func TestRemoveNewestProcessingBotReturnsOrderToPendingPosition(t *testing.T) {
	now := testTime()
	service := StartService()
	defer service.Close()

	mustClient(t, service, ClientCreateNormalOrder, now)
	mustClient(t, service, ClientCreateNormalOrder, now)
	mustManager(t, service, ManagerAddBot, now)
	mustManager(t, service, ManagerAddBot, now)
	mustClient(t, service, ClientCreateVIPOrder, now)
	mustClient(t, service, ClientCreateNormalOrder, now)

	response, err := service.HandleManagerRequest(context.Background(), ManagerRequest{Type: ManagerRemoveBot, At: now.Add(time.Millisecond)})
	if err != nil {
		t.Fatalf("remove bot request returned error: %v", err)
	}
	if got, want := orderIDs(response.Snapshot.Processing), []int{1001, 1002}; !reflect.DeepEqual(got, want) {
		t.Fatalf("processing order IDs after removing newest bot = %v, want %v", got, want)
	}
	if got, want := orderIDs(response.Snapshot.Pending), []int{1003, 1004}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs before cancel event = %v, want %v", got, want)
	}

	waitForCanceledLog(t, service, 1002)
	response, err = service.HandleClientRequest(context.Background(), ClientRequest{Type: ClientStatus, At: now})
	if err != nil {
		t.Fatalf("status request returned error: %v", err)
	}
	if got, want := orderIDs(response.Snapshot.Processing), []int{1001}; !reflect.DeepEqual(got, want) {
		t.Fatalf("processing order IDs after cancel event = %v, want %v", got, want)
	}
	if got, want := orderIDs(response.Snapshot.Pending), []int{1003, 1002, 1004}; !reflect.DeepEqual(got, want) {
		t.Fatalf("pending order IDs after cancel event = %v, want %v", got, want)
	}

	assertNoCompletedLog(t, service, 1002, 120*time.Millisecond)
}

func TestServiceRemoveIdleBot(t *testing.T) {
	now := testTime()
	service := StartService()
	defer service.Close()

	mustManager(t, service, ManagerAddBot, now)
	response, err := service.HandleManagerRequest(context.Background(), ManagerRequest{Type: ManagerRemoveBot, At: now})
	if err != nil {
		t.Fatalf("remove bot request returned error: %v", err)
	}
	if len(response.Snapshot.Bots) != 0 {
		t.Fatalf("active bots = %v, want none", response.Snapshot.Bots)
	}
}

func mustClient(t *testing.T, service *Service, requestType ClientRequestType, now time.Time) {
	t.Helper()
	if _, err := service.HandleClientRequest(context.Background(), ClientRequest{Type: requestType, At: now}); err != nil {
		t.Fatalf("client request %v returned error: %v", requestType, err)
	}
}

func mustManager(t *testing.T, service *Service, requestType ManagerRequestType, now time.Time) {
	t.Helper()
	if _, err := service.HandleManagerRequest(context.Background(), ManagerRequest{Type: requestType, At: now}); err != nil {
		t.Fatalf("manager request %v returned error: %v", requestType, err)
	}
}

func waitForCompletedLog(t *testing.T, service *Service, orderID int) {
	t.Helper()
	waitForLog(t, service, orderID, " completed ")
}

func waitForCanceledLog(t *testing.T, service *Service, orderID int) {
	t.Helper()
	waitForLog(t, service, orderID, " canceled ")
}

func waitForLog(t *testing.T, service *Service, orderID int, marker string) {
	t.Helper()

	timeout := time.NewTimer(12 * time.Second)
	defer timeout.Stop()

	for {
		select {
		case logs := <-service.Logs():
			for _, log := range logs {
				if containsOrderLog(log, orderID, marker) {
					return
				}
			}
		case <-timeout.C:
			t.Fatalf("timed out waiting for order #%d log containing %q", orderID, marker)
		}
	}
}

func assertNoCompletedLog(t *testing.T, service *Service, orderID int, duration time.Duration) {
	t.Helper()

	timer := time.NewTimer(duration)
	defer timer.Stop()

	for {
		select {
		case logs := <-service.Logs():
			for _, log := range logs {
				if containsOrderLog(log, orderID, " completed ") {
					t.Fatalf("unexpected completion log for order #%d: %s", orderID, log.Message)
				}
			}
		case <-timer.C:
			return
		}
	}
}

func containsOrderLog(log LogEntry, orderID int, marker string) bool {
	return strings.Contains(log.Message, marker) && strings.Contains(log.Message, fmt.Sprintf("Order #%d", orderID))
}
