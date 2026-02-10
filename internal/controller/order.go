package controller

import (
	"fmt"
	"os"
	"se-take-home-assignment/internal/logger"
	"sort"
	"strings"
	"sync"
	"time"
)

type OrderType int

const (
	OrderTypeNormal OrderType = iota
	OrderTypeVIP
)

type OrderStatus int

const (
	OrderStatusPending OrderStatus = iota
	OrderStatusProcessing
	OrderStatusComplete
)

type Order struct {
	ID       int
	Type     OrderType
	Status   OrderStatus
	BotID    int
	Created  time.Time
	Started  time.Time
	Completed time.Time
}

type BotStatus int

const (
	BotStatusIdle BotStatus = iota
	BotStatusProcessing
)

type Bot struct {
	ID       int
	Status   BotStatus
	Order    *Order
	stopChan chan bool
	mu       sync.Mutex
}

// IDGenerator provides simple, thread-safe ID generation
type IDGenerator struct {
	nextID int64
	mu     sync.Mutex
}

// NewIDGenerator creates a new ID generator starting from startID
func NewIDGenerator(startID int) *IDGenerator {
	return &IDGenerator{
		nextID: int64(startID),
	}
}

// GetID returns the next unique ID in a thread-safe manner
func (g *IDGenerator) GetID() int {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.nextID++
	return int(g.nextID)
}

type OrderController struct {
	logger          *logger.Logger
	orders          []*Order
	pendingOrders   []*Order
	completedOrders []*Order
	bots            []*Bot
	orderIDGen      *IDGenerator // Scalable ID generator
	botIDGen        *IDGenerator // Scalable ID generator
	mu              sync.Mutex
}

func NewOrderController(log *logger.Logger) *OrderController {
	return &OrderController{
		logger:          log,
		orders:          make([]*Order, 0),
		pendingOrders:   make([]*Order, 0),
		completedOrders: make([]*Order, 0),
		bots:            make([]*Bot, 0),
		orderIDGen:      NewIDGenerator(0), // Start at 0, first ID will be 1
		botIDGen:        NewIDGenerator(0), // Start at 0, first ID will be 1
	}
}

// createOrder creates a new order with the given type
func (oc *OrderController) createOrder(orderType OrderType) *Order {
	orderID := oc.orderIDGen.GetID()
	return &Order{
		ID:      orderID,
		Type:    orderType,
		Status:  OrderStatusPending,
		Created: time.Now(),
	}
}

// addOrderToSystem adds an order to the orders list and pending queue
func (oc *OrderController) addOrderToSystem(order *Order) {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	
	oc.orders = append(oc.orders, order)
	
	if order.Type == OrderTypeVIP {
		oc.insertVIPOrder(order)
		return
	}
	
	oc.pendingOrders = append(oc.pendingOrders, order)
}

// logOrderCreation logs the creation of an order
func (oc *OrderController) logOrderCreation(order *Order) {
	orderTypeStr := oc.getOrderTypeString(order.Type)
	oc.logger.Log("Created %s Order #%d - Status: PENDING", orderTypeStr, order.ID)
}

func (oc *OrderController) CreateNormalOrder() int {
	order := oc.createOrder(OrderTypeNormal)
	oc.addOrderToSystem(order)
	oc.logOrderCreation(order)
	oc.assignOrdersToBots()
	return order.ID
}

func (oc *OrderController) CreateVIPOrder() int {
	order := oc.createOrder(OrderTypeVIP)
	oc.addOrderToSystem(order)
	oc.logOrderCreation(order)
	oc.assignOrdersToBots()
	return order.ID
}

func (oc *OrderController) AddBot() int {
	botID := oc.botIDGen.GetID()

	bot := &Bot{
		ID:       botID,
		Status:   BotStatusIdle,
		stopChan: make(chan bool, 1),
	}

	oc.mu.Lock()
	oc.bots = append(oc.bots, bot)
	oc.mu.Unlock()

	oc.logger.Log("Bot #%d created - Status: ACTIVE", botID)
	oc.assignOrdersToBots()
	return botID
}

func (oc *OrderController) RemoveBot() int {
	bot := oc.removeBotFromList()
	if bot == nil {
		return 0
	}

	botID := bot.ID
	order, isProcessing := oc.stopBotProcessing(bot)
	if !isProcessing {
		oc.handleIdleBotRemoval(bot)
		return botID
	}

	oc.handleProcessingBotRemoval(bot, order)
	return botID
}

// stopBotProcessing stops the bot's processing and returns the order if it was processing
// Returns (order, true) if bot was processing, (nil, false) if idle
func (oc *OrderController) stopBotProcessing(bot *Bot) (*Order, bool) {
	bot.mu.Lock()
	defer bot.mu.Unlock()

	isProcessing := bot.Status == BotStatusProcessing && bot.Order != nil
	if !isProcessing {
		return nil, false
	}

	bot.stopChan <- true
	order := bot.Order
	order.Status = OrderStatusPending
	order.BotID = 0
	return order, true
}

// handleIdleBotRemoval handles the removal of an idle bot
func (oc *OrderController) handleIdleBotRemoval(bot *Bot) {
	oc.logger.Log("Bot #%d destroyed while IDLE", bot.ID)
	oc.assignOrdersToBots()
}

// handleProcessingBotRemoval handles the removal of a processing bot
// Returns the order back to the pending queue with proper priority
func (oc *OrderController) handleProcessingBotRemoval(bot *Bot, order *Order) {
	oc.mu.Lock()
	oc.insertOrderToPending(order)
	oc.mu.Unlock()

	oc.logger.Log("Bot #%d destroyed while processing Order #%d - Order returned to PENDING", bot.ID, order.ID)
	oc.assignOrdersToBots()
}

// removeBotFromList removes and returns the newest bot (last in the slice)
// Returns nil if no bots exist. This function handles locking internally.
func (oc *OrderController) removeBotFromList() *Bot {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	if len(oc.bots) == 0 {
		return nil
	}

	botIndex := len(oc.bots) - 1
	bot := oc.bots[botIndex]
	oc.bots = oc.bots[:botIndex]
	return bot
}

// canAssignOrder checks if a bot can be assigned an order
func (oc *OrderController) canAssignOrder(bot *Bot) bool {
	return bot.Status == BotStatusIdle && len(oc.pendingOrders) > 0
}

// getNextPendingOrder retrieves and removes the next pending order from the queue
func (oc *OrderController) getNextPendingOrder() *Order {
	if len(oc.pendingOrders) == 0 {
		return nil
	}
	order := oc.pendingOrders[0]
	oc.pendingOrders = oc.pendingOrders[1:]
	return order
}

// assignOrderToBot assigns an order to a bot and starts processing
func (oc *OrderController) assignOrderToBot(bot *Bot, order *Order) {
	bot.Order = order
	bot.Status = BotStatusProcessing
	order.Status = OrderStatusProcessing
	order.BotID = bot.ID
	order.Started = time.Now()
}

// logOrderAssignment logs when a bot picks up an order
func (oc *OrderController) logOrderAssignment(bot *Bot, order *Order) {
	orderTypeStr := oc.getOrderTypeString(order.Type)
	oc.logger.Log("Bot #%d picked up %s Order #%d - Status: PROCESSING",
		bot.ID, orderTypeStr, order.ID)
}

func (oc *OrderController) assignOrdersToBots() {
	oc.mu.Lock()
	defer oc.mu.Unlock()

	for _, bot := range oc.bots {
		bot.mu.Lock()
		if oc.canAssignOrder(bot) {
			order := oc.getNextPendingOrder()
			oc.assignOrderToBot(bot, order)
			oc.logOrderAssignment(bot, order)
			go oc.processOrder(bot)
		}
		bot.mu.Unlock()
	}
}

func (oc *OrderController) processOrder(bot *Bot) {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	startTime := time.Now()
	duration := 10 * time.Second

	for {
		select {
		case <-bot.stopChan:
			return
		case <-ticker.C:
			if time.Since(startTime) >= duration {
				order := oc.completeOrderProcessing(bot)
				if order == nil {
					return
				}
				oc.finalizeOrderCompletion(bot, order)
				return
			}
		}
	}
}

// completeOrderProcessing marks the order as complete and sets bot to idle
// Returns the completed order, or nil if bot has no order
func (oc *OrderController) completeOrderProcessing(bot *Bot) *Order {
	bot.mu.Lock()
	defer bot.mu.Unlock()

	if bot.Order == nil {
		return nil
	}

	order := bot.Order
	order.Status = OrderStatusComplete
	order.Completed = time.Now()
	bot.Order = nil
	bot.Status = BotStatusIdle
	return order
}

// addCompletedOrder adds an order to the completed orders list
func (oc *OrderController) addCompletedOrder(order *Order) {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	oc.completedOrders = append(oc.completedOrders, order)
}

// hasPendingOrders checks if there are any pending orders
func (oc *OrderController) hasPendingOrders() bool {
	oc.mu.Lock()
	defer oc.mu.Unlock()
	return len(oc.pendingOrders) > 0
}

// logOrderCompletion logs when an order is completed
func (oc *OrderController) logOrderCompletion(bot *Bot, order *Order, processingTime time.Duration) {
	orderTypeStr := oc.getOrderTypeString(order.Type)
	oc.logger.Log("Bot #%d completed %s Order #%d - Status: COMPLETE (Processing time: %ds)",
		bot.ID, orderTypeStr, order.ID, int(processingTime.Seconds()))
}

// logBotIdle logs when a bot becomes idle
func (oc *OrderController) logBotIdle(bot *Bot) {
	oc.logger.Log("Bot #%d is now IDLE - No pending orders", bot.ID)
}

// finalizeOrderCompletion updates completed orders, logs completion, and assigns next order
func (oc *OrderController) finalizeOrderCompletion(bot *Bot, order *Order) {
	processingTime := order.Completed.Sub(order.Started)
	
	oc.addCompletedOrder(order)
	oc.logOrderCompletion(bot, order, processingTime)
	oc.assignOrdersToBots()

	if oc.hasPendingOrders() {
		return
	}
	
	oc.logBotIdle(bot)
}


// StatusSnapshot represents a snapshot of the current system status
type StatusSnapshot struct {
	CompletedOrders   int
	ProcessingOrders  int
	PendingOrders     int
	TotalBots         int
	ActiveBots        int
	IdleBots          int
	VIPCompleted      int
	NormalCompleted   int
	VIPPending        int
	NormalPending     int
}

// countOrdersByType counts orders by type in a slice
func countOrdersByType(orders []*Order) (vipCount, normalCount int) {
	for _, order := range orders {
		switch order.Type {
		case OrderTypeVIP:
			vipCount++
		case OrderTypeNormal:
			normalCount++
		}
	}
	return vipCount, normalCount
}

// countProcessingOrders counts orders that are currently processing
func (oc *OrderController) countProcessingOrders() int {
	count := 0
	for _, order := range oc.orders {
		if order.Status != OrderStatusProcessing {
			continue
		}
		count++
	}
	return count
}

// countBotsByStatus counts bots by their status
func (oc *OrderController) countBotsByStatus() (activeCount, idleCount int) {
	for _, bot := range oc.bots {
		bot.mu.Lock()
		if bot.Status == BotStatusProcessing {
			activeCount++
			bot.mu.Unlock()
			continue
		}
		idleCount++
		bot.mu.Unlock()
	}
	return activeCount, idleCount
}

// getStatusSnapshotLocked returns the current status snapshot (assumes lock is held)
func (oc *OrderController) getStatusSnapshotLocked() StatusSnapshot {
	vipCompleted, normalCompleted := countOrdersByType(oc.completedOrders)
	vipPending, normalPending := countOrdersByType(oc.pendingOrders)
	processingCount := oc.countProcessingOrders()
	activeBots, idleBots := oc.countBotsByStatus()

	return StatusSnapshot{
		CompletedOrders:  len(oc.completedOrders),
		ProcessingOrders: processingCount,
		PendingOrders:     len(oc.pendingOrders),
		TotalBots:         len(oc.bots),
		ActiveBots:        activeBots,
		IdleBots:          idleBots,
		VIPCompleted:      vipCompleted,
		NormalCompleted:   normalCompleted,
		VIPPending:        vipPending,
		NormalPending:     normalPending,
	}
}

// getOrderTypeAbbreviation returns the abbreviation for an order type
func getOrderTypeAbbreviation(orderType OrderType) string {
	if orderType == OrderTypeVIP {
		return "V"
	}
	return "N"
}

// formatOrderSequence formats a list of order IDs into a readable string
func formatOrderSequence(orders []*Order) string {
	if len(orders) == 0 {
		return "none"
	}
	
	ids := make([]string, len(orders))
	for i, order := range orders {
		orderType := getOrderTypeAbbreviation(order.Type)
		ids[i] = fmt.Sprintf("#%d(%s)", order.ID, orderType)
	}
	return strings.Join(ids, ", ")
}

// BotInfo represents information about a bot's current state
type BotInfo struct {
	BotID     int
	Status    string
	OrderID   int
	OrderType string
}

// sortOrdersByID sorts orders by ID in ascending order
func sortOrdersByID(orders []*Order) {
	sort.Slice(orders, func(i, j int) bool {
		return orders[i].ID < orders[j].ID
	})
}

// sortPendingOrders sorts pending orders maintaining VIP priority
// VIP orders first (sorted by ID), then Normal orders (sorted by ID)
func sortPendingOrders(orders []*Order) {
	sort.Slice(orders, func(i, j int) bool {
		// VIP orders always come before Normal orders
		if orders[i].Type != orders[j].Type {
			return orders[i].Type == OrderTypeVIP
		}
		// Within the same type, sort by ID
		return orders[i].ID < orders[j].ID
	})
}

// collectOrderData collects all order data needed for status display
// Returns sorted orders: pending (VIP first by ID, then Normal by ID), completed (by ID), processing (by ID)
func (oc *OrderController) collectOrderData() (pendingOrders, completedOrders, processingOrders []*Order) {
	pendingOrders = make([]*Order, len(oc.pendingOrders))
	copy(pendingOrders, oc.pendingOrders)
	sortPendingOrders(pendingOrders)
	
	completedOrders = make([]*Order, len(oc.completedOrders))
	copy(completedOrders, oc.completedOrders)
	sortOrdersByID(completedOrders)
	
	processingOrders = make([]*Order, 0)
	for _, order := range oc.orders {
		if order.Status != OrderStatusProcessing {
			continue
		}
		processingOrders = append(processingOrders, order)
	}
	sortOrdersByID(processingOrders)
	return pendingOrders, completedOrders, processingOrders
}

// createBotInfo creates BotInfo from a bot
func createBotInfo(bot *Bot) BotInfo {
	info := BotInfo{
		BotID:  bot.ID,
		Status: "Idle",
	}
	
	if bot.Status != BotStatusProcessing || bot.Order == nil {
		return info
	}
	
	info.Status = "Active"
	info.OrderID = bot.Order.ID
	info.OrderType = getOrderTypeAbbreviation(bot.Order.Type)
	return info
}

// collectBotInfo collects information about all bots
func (oc *OrderController) collectBotInfo() []BotInfo {
	botInfo := make([]BotInfo, 0, len(oc.bots))
	
	for _, bot := range oc.bots {
		bot.mu.Lock()
		info := createBotInfo(bot)
		bot.mu.Unlock()
		botInfo = append(botInfo, info)
	}
	return botInfo
}

// formatBotDetail formats a single bot's detail string
func formatBotDetail(bot BotInfo) string {
	if bot.Status == "Active" {
		return fmt.Sprintf("Bot #%d: %s (Order #%d(%s))", 
			bot.BotID, bot.Status, bot.OrderID, bot.OrderType)
	}
	return fmt.Sprintf("Bot #%d: %s", bot.BotID, bot.Status)
}

// formatBotDetails formats bot information into a readable string
func formatBotDetails(botInfo []BotInfo) string {
	if len(botInfo) == 0 {
		return "none"
	}
	
	details := make([]string, 0, len(botInfo))
	for _, bot := range botInfo {
		details = append(details, formatBotDetail(bot))
	}
	return strings.Join(details, ", ")
}

// logStatusToFile logs status information to the logger
func (oc *OrderController) logStatusToFile(snapshot StatusSnapshot, completedSeq, processingSeq, pendingSeq, botInfoStr string) {
	oc.logger.Log("Status Check:")
	oc.logger.Log("- Completed Orders: %d (%d VIP, %d Normal) - Sequence: %s",
		snapshot.CompletedOrders, snapshot.VIPCompleted, snapshot.NormalCompleted,
		completedSeq)
	oc.logger.Log("- Processing Orders: %d - Sequence: %s",
		snapshot.ProcessingOrders, processingSeq)
	oc.logger.Log("- Pending Orders: %d (%d VIP, %d Normal) - Sequence: %s",
		snapshot.PendingOrders, snapshot.VIPPending, snapshot.NormalPending,
		pendingSeq)
	oc.logger.Log("- Total Bots: %d (%d Active, %d Idle) - %s",
		snapshot.TotalBots, snapshot.ActiveBots, snapshot.IdleBots, botInfoStr)
}

// printStatusHeader prints the status display header
func printStatusHeader() {
	fmt.Println(strings.Repeat("-", 50))
	fmt.Println("  Current System Status")
	fmt.Println(strings.Repeat("-", 50))
}

// printOrderSequence prints order sequence if orders exist
func printOrderSequence(sequence string) {
	if sequence == "none" {
		return
	}
	fmt.Printf("    Sequence: %s\n", sequence)
}

// printOrderStatus prints order status information
func printOrderStatus(snapshot StatusSnapshot, completedOrders, processingOrders, pendingOrders []*Order, completedSeq, processingSeq, pendingSeq string) {
	fmt.Printf("  Completed Orders: %d total (%d VIP, %d Normal)\n",
		snapshot.CompletedOrders, snapshot.VIPCompleted, snapshot.NormalCompleted)
	printOrderSequence(completedSeq)
	
	fmt.Printf("  Processing Orders: %d\n", snapshot.ProcessingOrders)
	printOrderSequence(processingSeq)
	
	fmt.Printf("  Pending Orders: %d total (%d VIP, %d Normal)\n",
		snapshot.PendingOrders, snapshot.VIPPending, snapshot.NormalPending)
	printOrderSequence(pendingSeq)
}

// printBotStatus prints bot status information
func printBotStatus(snapshot StatusSnapshot, botInfoStr string) {
	fmt.Printf("  Total Bots: %d (%d Active, %d Idle)\n",
		snapshot.TotalBots, snapshot.ActiveBots, snapshot.IdleBots)
	if botInfoStr == "none" {
		fmt.Println(strings.Repeat("-", 50))
		return
	}
	fmt.Printf("    Bot Details: %s\n", botInfoStr)
	fmt.Println(strings.Repeat("-", 50))
}

// PrintStatusToStdout prints the current status to stdout for interactive CLI
// Updates in place if status was previously displayed
func (oc *OrderController) PrintStatusToStdout() {
	oc.mu.Lock()
	
	pendingOrders, completedOrders, processingOrders := oc.collectOrderData()
	botInfo := oc.collectBotInfo()
	snapshot := oc.getStatusSnapshotLocked()
	
	completedSeq := formatOrderSequence(completedOrders)
	processingSeq := formatOrderSequence(processingOrders)
	pendingSeq := formatOrderSequence(pendingOrders)
	botInfoStr := formatBotDetails(botInfo)
	
	oc.logStatusToFile(snapshot, completedSeq, processingSeq, pendingSeq, botInfoStr)
	
	oc.mu.Unlock()

	// Print to stdout (no lock needed)
	printStatusHeader()
	printOrderStatus(snapshot, completedOrders, processingOrders, pendingOrders, completedSeq, processingSeq, pendingSeq)
	printBotStatus(snapshot, botInfoStr)
	
	// Ensure output is flushed immediately
	os.Stdout.Sync()
}

// insertOrderToPending inserts an order into the pending queue with proper priority
// VIP orders are placed after all existing VIP orders but before all normal orders
// Normal orders are appended to the end
func (oc *OrderController) insertOrderToPending(order *Order) {
	if order.Type == OrderTypeVIP {
		oc.insertVIPOrder(order)
		return
	}
	oc.pendingOrders = append(oc.pendingOrders, order)
}

// insertVIPOrder inserts a VIP order into the pending queue
// VIP orders are placed after all existing VIP orders but before all normal orders
func (oc *OrderController) insertVIPOrder(order *Order) {
	// Find the insertion index: after all VIP orders, before all normal orders
	insertIndex := 0
	for i, pendingOrder := range oc.pendingOrders {
		if pendingOrder.Type == OrderTypeVIP {
			insertIndex = i + 1
		}
	}

	newPendingOrders := make([]*Order, 0, len(oc.pendingOrders)+1)
	newPendingOrders = append(newPendingOrders, oc.pendingOrders[:insertIndex]...)
	newPendingOrders = append(newPendingOrders, order)
	newPendingOrders = append(newPendingOrders, oc.pendingOrders[insertIndex:]...)
	oc.pendingOrders = newPendingOrders
}

func (oc *OrderController) getOrderTypeString(orderType OrderType) string {
	if orderType == OrderTypeVIP {
		return "VIP"
	}
	return "Normal"
}

