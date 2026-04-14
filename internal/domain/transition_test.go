package domain

import "testing"

func TestOrder_StartProcessing_Complete(t *testing.T) {
	var bot BotID = 7
	o := &Order{ID: 1, Tier: TierVIP, Status: OrderPending}
	if err := o.StartProcessing(bot, TierVIP, 0); err != nil {
		t.Fatal(err)
	}
	if o.Status != OrderProcessing || o.BotID == nil || *o.BotID != bot {
		t.Fatalf("unexpected: %+v", o)
	}
	if o.PendingTier != TierVIP || o.PendingIndex != 0 {
		t.Fatalf("anchor: %+v", o)
	}
	if err := o.Complete(); err != nil {
		t.Fatal(err)
	}
	if o.Status != OrderComplete || o.BotID != nil {
		t.Fatalf("unexpected: %+v", o)
	}
}

func TestOrder_CancelProcessingToPending(t *testing.T) {
	var bot BotID = 2
	o := &Order{ID: 3, Tier: TierNormal, Status: OrderPending}
	_ = o.StartProcessing(bot, TierNormal, 2)
	if err := o.CancelProcessingToPending(); err != nil {
		t.Fatal(err)
	}
	if o.Status != OrderPending || o.BotID != nil {
		t.Fatalf("unexpected: %+v", o)
	}
	if o.PendingTier != TierNormal || o.PendingIndex != 2 {
		t.Fatalf("anchor should be kept for repo: %+v", o)
	}
}

func TestOrder_FailToException(t *testing.T) {
	var bot BotID = 1
	o := &Order{ID: 4, Status: OrderPending}
	_ = o.StartProcessing(bot, TierVIP, 1)
	if err := o.FailToException(ExceptionInternal, "E_INTERNAL", "boom"); err != nil {
		t.Fatal(err)
	}
	if o.Status != OrderException || o.BotID != nil {
		t.Fatalf("unexpected: %+v", o)
	}
	if o.ErrorCode != "E_INTERNAL" || o.Exception != ExceptionInternal {
		t.Fatalf("unexpected: %+v", o)
	}
}

func TestOrder_RetryFromExceptionToPending(t *testing.T) {
	o := &Order{ID: 5, Tier: TierVIP, Status: OrderException, Exception: ExceptionTimeout, ErrorCode: "T"}
	if err := o.RetryFromExceptionToPending(); err != nil {
		t.Fatal(err)
	}
	if o.Status != OrderPending || o.ErrorCode != "" || o.Exception != ExceptionUnknown {
		t.Fatalf("unexpected: %+v", o)
	}
}

func TestTransitions_Invalid(t *testing.T) {
	o := &Order{Status: OrderComplete}
	if err := o.StartProcessing(1, TierNormal, 0); err == nil {
		t.Fatal("expected error")
	}
	o2 := &Order{Status: OrderPending}
	if err := o2.Complete(); err == nil {
		t.Fatal("expected error")
	}
	if err := o2.CancelProcessingToPending(); err == nil {
		t.Fatal("expected error")
	}
	if err := o2.FailToException(ExceptionUnknown, "", ""); err == nil {
		t.Fatal("expected error")
	}
	if err := o2.RetryFromExceptionToPending(); err == nil {
		t.Fatal("expected error")
	}
}
