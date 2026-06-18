package tui

import (
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/feedmepos/se-take-home-assignment/internal/controller"
)

type tickMsg time.Time

const (
	panelViewportRows = 8
	eventViewportRows = 6
)

type panelID int

const (
	panelPending panelID = iota
	panelProcessing
	panelCompleted
	panelEvents
)

type scrollState struct {
	pending    int
	processing int
	completed  int
	events     int
}

type viewLayout struct {
	width    int
	content  string
	hitBoxes []panelHitBox
}

type panelHitBox struct {
	panel  panelID
	x      int
	y      int
	width  int
	height int
}

type model struct {
	controller *controller.Controller
	now        time.Time
	width      int
	height     int
	focused    panelID
	scroll     scrollState
}

func Run() error {
	program := tea.NewProgram(newModel(), tea.WithAltScreen(), tea.WithMouseCellMotion())
	_, err := program.Run()
	return err
}

func newModel() model {
	now := time.Now()
	return model{
		controller: controller.New(),
		now:        now,
		width:      120,
		height:     40,
		focused:    panelPending,
	}
}

func (m model) Init() tea.Cmd {
	return tick()
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil
	case tickMsg:
		m.now = time.Time(msg)
		m.controller.Tick(m.now)
		m = m.clampScrolls()
		return m, tick()
	case tea.KeyMsg:
		now := time.Now()
		m.now = now
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit
		case "tab", "right", "l":
			m.focused = nextPanel(m.focused)
		case "shift+tab", "left", "h":
			m.focused = previousPanel(m.focused)
		case "up", "k":
			m = m.scrollFocused(-1)
		case "down", "j":
			m = m.scrollFocused(1)
		case "pgup":
			m = m.scrollFocused(-m.focusedViewportRows())
		case "pgdown":
			m = m.scrollFocused(m.focusedViewportRows())
		case "home":
			m = m.jumpFocused(false)
		case "end":
			m = m.jumpFocused(true)
		case "n":
			m.controller.CreateOrder(controller.NormalOrder, now)
			m = m.clampScrolls()
		case "v":
			m.controller.CreateOrder(controller.VIPOrder, now)
			m = m.clampScrolls()
		case "+":
			m.controller.AddBot(now)
			m = m.clampScrolls()
		case "-":
			m.controller.RemoveNewestBot(now)
			m = m.clampScrolls()
		}
		return m, nil
	case tea.MouseMsg:
		switch msg.Type {
		case tea.MouseWheelUp:
			return m.scrollUnderMouse(msg.X, msg.Y, -1), nil
		case tea.MouseWheelDown:
			return m.scrollUnderMouse(msg.X, msg.Y, 1), nil
		}
	}
	return m, nil
}

func tick() tea.Cmd {
	return tea.Tick(250*time.Millisecond, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
}

func (m model) View() string {
	layout := m.buildViewLayout(m.controller.Snapshot(m.now))
	return appStyle.Width(layout.width).Render(lipgloss.PlaceHorizontal(layout.width, lipgloss.Center, layout.content))
}

func (m model) buildViewLayout(snapshot controller.Snapshot) viewLayout {
	width := m.width
	if width < 80 {
		width = 80
	}

	pageWidth := width - 4
	if pageWidth < 76 {
		pageWidth = 76
	}
	gapWidth := 3
	gap := strings.Repeat(" ", gapWidth)
	panelOuterWidth := (pageWidth - gapWidth*2) / 3
	if panelOuterWidth < 34 {
		panelOuterWidth = 34
	}
	panelContentWidth := panelOuterWidth - frameX
	if panelContentWidth < 28 {
		panelContentWidth = 28
	}

	title := lipgloss.PlaceHorizontal(pageWidth, lipgloss.Center, titleStyle.Render("MCDONALD'S  ORDER  CONTROLLER"))
	pending := renderPending(snapshot.Pending, panelContentWidth, m.scroll.pending)
	bots := renderBots(snapshot.Bots, panelContentWidth, m.scroll.processing)
	completed := renderCompleted(snapshot.Completed, panelContentWidth, m.scroll.completed)

	var body string
	if width < 100 {
		body = lipgloss.JoinVertical(lipgloss.Left, pending, bots, completed)
	} else {
		body = lipgloss.JoinHorizontal(lipgloss.Top, pending, gap, bots, gap, completed)
	}
	bodyRaw := body
	body = lipgloss.PlaceHorizontal(pageWidth, lipgloss.Center, body)

	logContentWidth := pageWidth - logFrameX
	if logContentWidth < 70 {
		logContentWidth = 70
	}
	rawLogs := renderEvents(snapshot.Events, logContentWidth, m.scroll.events)
	logs := lipgloss.PlaceHorizontal(pageWidth, lipgloss.Center, rawLogs)
	help := lipgloss.PlaceHorizontal(pageWidth, lipgloss.Center, renderHelp(m.focused))

	content := lipgloss.JoinVertical(
		lipgloss.Center,
		title,
		body,
		"",
		logs,
		help,
	)

	contentLeft := centerOffset(width, pageWidth)
	bodyX := contentLeft + centerOffset(pageWidth, lipgloss.Width(bodyRaw))
	bodyY := lineCount(title)
	logY := bodyY + lineCount(body) + 1

	hitBoxes := make([]panelHitBox, 0, 4)
	if width < 100 {
		y := bodyY
		hitBoxes = append(hitBoxes, newPanelHitBox(panelPending, bodyX, y, pending))
		y += lineCount(pending)
		hitBoxes = append(hitBoxes, newPanelHitBox(panelProcessing, bodyX, y, bots))
		y += lineCount(bots)
		hitBoxes = append(hitBoxes, newPanelHitBox(panelCompleted, bodyX, y, completed))
	} else {
		x := bodyX
		hitBoxes = append(hitBoxes, newPanelHitBox(panelPending, x, bodyY, pending))
		x += lipgloss.Width(pending) + gapWidth
		hitBoxes = append(hitBoxes, newPanelHitBox(panelProcessing, x, bodyY, bots))
		x += lipgloss.Width(bots) + gapWidth
		hitBoxes = append(hitBoxes, newPanelHitBox(panelCompleted, x, bodyY, completed))
	}

	logX := contentLeft + centerOffset(pageWidth, lipgloss.Width(rawLogs))
	hitBoxes = append(hitBoxes, newPanelHitBox(panelEvents, logX, logY, rawLogs))

	return viewLayout{
		width:    width,
		content:  content,
		hitBoxes: hitBoxes,
	}
}

func (m model) clampScrolls() model {
	snapshot := m.controller.Snapshot(m.now)
	m.scroll.pending = clampOffset(m.scroll.pending, len(snapshot.Pending), panelViewportRows)
	m.scroll.processing = clampOffset(m.scroll.processing, len(snapshot.Bots), panelViewportRows)
	m.scroll.completed = clampOffset(m.scroll.completed, len(snapshot.Completed), panelViewportRows)
	m.scroll.events = clampOffset(m.scroll.events, len(snapshot.Events), eventViewportRows)
	return m
}

func (m model) scrollFocused(delta int) model {
	return m.scrollPanel(m.focused, delta)
}

func (m model) scrollUnderMouse(x int, y int, delta int) model {
	panel, ok := m.panelAt(x, y)
	if !ok {
		return m
	}
	m.focused = panel
	return m.scrollPanel(panel, delta)
}

func (m model) scrollPanel(panel panelID, delta int) model {
	snapshot := m.controller.Snapshot(m.now)
	switch panel {
	case panelPending:
		m.scroll.pending = clampOffset(m.scroll.pending+delta, len(snapshot.Pending), panelViewportRows)
	case panelProcessing:
		m.scroll.processing = clampOffset(m.scroll.processing+delta, len(snapshot.Bots), panelViewportRows)
	case panelCompleted:
		m.scroll.completed = clampOffset(m.scroll.completed+delta, len(snapshot.Completed), panelViewportRows)
	case panelEvents:
		m.scroll.events = clampOffset(m.scroll.events-delta, len(snapshot.Events), eventViewportRows)
	}
	return m
}

func (m model) panelAt(x int, y int) (panelID, bool) {
	layout := m.buildViewLayout(m.controller.Snapshot(m.now))
	for _, hitBox := range layout.hitBoxes {
		if hitBox.contains(x, y) {
			return hitBox.panel, true
		}
	}
	return panelPending, false
}

func (m model) jumpFocused(toEnd bool) model {
	snapshot := m.controller.Snapshot(m.now)
	offset := 0
	switch m.focused {
	case panelPending:
		if toEnd {
			offset = maxOffset(len(snapshot.Pending), panelViewportRows)
		}
		m.scroll.pending = offset
	case panelProcessing:
		if toEnd {
			offset = maxOffset(len(snapshot.Bots), panelViewportRows)
		}
		m.scroll.processing = offset
	case panelCompleted:
		if toEnd {
			offset = maxOffset(len(snapshot.Completed), panelViewportRows)
		}
		m.scroll.completed = offset
	case panelEvents:
		if !toEnd {
			offset = maxOffset(len(snapshot.Events), eventViewportRows)
		}
		m.scroll.events = offset
	}
	return m
}

func (m model) focusedViewportRows() int {
	if m.focused == panelEvents {
		return eventViewportRows
	}
	return panelViewportRows
}

func renderPending(orders []controller.Order, contentWidth int, offset int) string {
	start, end := visibleRange(len(orders), offset, panelViewportRows)
	rows := []string{
		pendingTextStyle.Render(orderRow(contentWidth, "TYPE", "ORDER", "CREATED")),
		pendingTextStyle.Render(strings.Repeat("-", contentWidth)),
		"",
	}
	for _, order := range orders[start:end] {
		rows = append(rows, orderRow(contentWidth, orderBadge(order.Type), orderID(order.ID), order.CreatedAt.Format("15:04:05")))
	}
	rows = withPanelFooter(rows, pendingTextStyle.Render(strings.Repeat("-", contentWidth)), pendingTextStyle.Render(panelFooter("orders", len(orders), start, end, panelViewportRows)))
	return renderPanel("PENDING", rows, contentWidth, pendingColor, pendingHeaderStyle)
}

func renderBots(bots []controller.BotSnapshot, contentWidth int, offset int) string {
	start, end := visibleRange(len(bots), offset, panelViewportRows)
	rows := []string{
		processingTextStyle.Render(botRow(contentWidth, "BOT", "ORDER", "LEFT")),
		processingTextStyle.Render(strings.Repeat("-", contentWidth)),
		"",
	}
	for _, bot := range bots[start:end] {
		order := idleBadge()
		left := "--"
		if bot.Status == controller.BotProcessingStatus {
			order = fmt.Sprintf("%s %s", orderBadge(bot.CurrentType), orderID(bot.CurrentOrderID))
			left = fmt.Sprintf("%02ds", int(bot.Remaining.Seconds()+0.999))
		}
		rows = append(rows, botRow(contentWidth, fmt.Sprintf("Bot #%d", bot.ID), order, left))
	}
	rows = withPanelFooter(rows, processingTextStyle.Render(strings.Repeat("-", contentWidth)), processingTextStyle.Render(panelFooter("bots", len(bots), start, end, panelViewportRows)))
	return renderPanel("PROCESSING", rows, contentWidth, processingColor, processingHeaderStyle)
}

func renderCompleted(orders []controller.Order, contentWidth int, offset int) string {
	reversed := reverseOrders(orders)
	start, end := visibleRange(len(reversed), offset, panelViewportRows)
	rows := []string{
		completedTextStyle.Render(orderRow(contentWidth, "TYPE", "ORDER", "DONE")),
		completedTextStyle.Render(strings.Repeat("-", contentWidth)),
		"",
	}
	for _, order := range reversed[start:end] {
		rows = append(rows, orderRow(contentWidth, orderBadge(order.Type), orderID(order.ID), order.CompletedAt.Format("15:04:05")))
	}
	rows = withPanelFooter(rows, completedTextStyle.Render(strings.Repeat("-", contentWidth)), completedTextStyle.Render(panelFooter("done", len(orders), start, end, panelViewportRows)))
	return renderPanel("COMPLETED", rows, contentWidth, completedColor, completedHeaderStyle)
}

func withPanelFooter(rows []string, separator string, footer string) []string {
	const panelBodyLines = 14
	for len(rows) < panelBodyLines-2 {
		rows = append(rows, "")
	}
	rows = append(rows, separator, footer)
	return rows
}

func renderEvents(events []controller.Event, contentWidth int, offset int) string {
	start, end := tailRange(len(events), offset, eventViewportRows)
	rows := []string{}
	for _, event := range events[start:end] {
		rows = append(rows, fmt.Sprintf("[%s] %s", event.Time.Format("15:04:05"), event.Message))
	}
	if len(events) == 0 {
		rows = append(rows, "Waiting for activity...")
	}
	for len(rows) < eventViewportRows {
		rows = append(rows, "")
	}
	box := logPanelStyle.Width(contentWidth + 4).Render(strings.Join(rows, "\n"))
	return withBorderTitle(box, "#CCCCCC", eventHeaderStyle.Render("EVENTS"))
}

func renderPanel(title string, rows []string, contentWidth int, color string, headerStyle lipgloss.Style) string {
	box := panelStyle(contentWidth, color).Render(strings.Join(rows, "\n"))
	return withBorderTitle(box, color, headerStyle.Render(title))
}

func withBorderTitle(box string, color string, title string) string {
	lines := strings.Split(box, "\n")
	if len(lines) == 0 {
		return box
	}

	width := lipgloss.Width(lines[0])
	borderStyle := lipgloss.NewStyle().Foreground(lipgloss.Color(color))
	titleBadge := title
	titleWidth := lipgloss.Width(titleBadge)
	if width <= titleWidth+2 {
		return box
	}

	leftWidth := (width - titleWidth) / 2
	rightWidth := width - titleWidth - leftWidth
	lines[0] = borderStyle.Render("╭"+strings.Repeat("─", leftWidth-1)) +
		titleBadge +
		borderStyle.Render(strings.Repeat("─", rightWidth-1)+"╮")
	return strings.Join(lines, "\n")
}

func renderHelp(focused panelID) string {
	items := []string{
		helpItem("n", "Normal"),
		helpItem("v", "VIP"),
		helpItem("+", "Bot"),
		helpItem("-", "Bot"),
		helpItem("tab", focused.label()),
		helpItem("↑↓", "Scroll"),
		helpItem("q", "Quit"),
	}
	return helpStyle.Render(lipgloss.JoinHorizontal(lipgloss.Center, items...))
}

func helpItem(key string, label string) string {
	return lipgloss.JoinHorizontal(lipgloss.Center, keyStyle.Render(key), " ", label, "    ")
}

func orderRow(contentWidth int, orderType string, orderID string, timeText string) string {
	return placeCells(cell{pos: 0, text: orderType}, cell{pos: columnPos(contentWidth, 1), text: orderID}, cell{pos: columnPos(contentWidth, 2), text: timeText})
}

func botRow(contentWidth int, bot string, order string, left string) string {
	return placeCells(cell{pos: 0, text: bot}, cell{pos: columnPos(contentWidth, 1), text: order}, cell{pos: columnPos(contentWidth, 2), text: left})
}

type cell struct {
	pos  int
	text string
}

func placeCells(cells ...cell) string {
	var builder strings.Builder
	cursor := 0
	for _, cell := range cells {
		pos := cell.pos
		if pos < cursor {
			pos = cursor + 1
		}
		if pos > cursor {
			builder.WriteString(strings.Repeat(" ", pos-cursor))
		}
		builder.WriteString(cell.text)
		cursor = pos + lipgloss.Width(cell.text)
	}
	return builder.String()
}

func orderBadge(orderType controller.OrderType) string {
	if orderType == controller.VIPOrder {
		return vipBadgeStyle.Render("VIP")
	}
	return normalBadgeStyle.Render("NORMAL")
}

func orderID(id int) string {
	return fmt.Sprintf("#%d", id)
}

func idleBadge() string {
	return idleBadgeStyle.Render("IDLE")
}

func panelFooter(label string, total int, start int, end int, limit int) string {
	footer := fmt.Sprintf("Total: %d %s", total, label)
	if total > limit {
		footer = fmt.Sprintf("%s  %d-%d/%d%s", footer, start+1, end, total, scrollHint(start, end, total))
	}
	return footer
}

func scrollHint(start int, end int, total int) string {
	hint := ""
	if start > 0 {
		hint += " ↑"
	}
	if end < total {
		hint += " ↓"
	}
	return hint
}

func visibleRange(total int, offset int, limit int) (int, int) {
	offset = clampOffset(offset, total, limit)
	end := offset + limit
	if end > total {
		end = total
	}
	return offset, end
}

func tailRange(total int, offset int, limit int) (int, int) {
	offset = clampOffset(offset, total, limit)
	end := total - offset
	if end < 0 {
		end = 0
	}
	start := end - limit
	if start < 0 {
		start = 0
	}
	return start, end
}

func clampOffset(offset int, total int, limit int) int {
	if offset < 0 {
		return 0
	}
	max := maxOffset(total, limit)
	if offset > max {
		return max
	}
	return offset
}

func maxOffset(total int, limit int) int {
	max := total - limit
	if max < 0 {
		return 0
	}
	return max
}

func columnPos(contentWidth int, column int) int {
	if column < 1 {
		return 0
	}
	if column > 2 {
		column = 2
	}
	return contentWidth * column / 3
}

func newPanelHitBox(panel panelID, x int, y int, rendered string) panelHitBox {
	return panelHitBox{
		panel:  panel,
		x:      x,
		y:      y,
		width:  lipgloss.Width(rendered),
		height: lineCount(rendered),
	}
}

func (hitBox panelHitBox) contains(x int, y int) bool {
	return x >= hitBox.x &&
		x < hitBox.x+hitBox.width &&
		y >= hitBox.y &&
		y < hitBox.y+hitBox.height
}

func centerOffset(width int, contentWidth int) int {
	if width <= contentWidth {
		return 0
	}
	return (width - contentWidth) / 2
}

func lineCount(rendered string) int {
	if rendered == "" {
		return 0
	}
	return len(strings.Split(rendered, "\n"))
}

func reverseOrders(orders []controller.Order) []controller.Order {
	reversed := make([]controller.Order, len(orders))
	for i := range orders {
		reversed[len(orders)-1-i] = orders[i]
	}
	return reversed
}

func nextPanel(panel panelID) panelID {
	if panel == panelEvents {
		return panelPending
	}
	return panel + 1
}

func previousPanel(panel panelID) panelID {
	if panel == panelPending {
		return panelEvents
	}
	return panel - 1
}

func (panel panelID) label() string {
	switch panel {
	case panelPending:
		return "Pending"
	case panelProcessing:
		return "Processing"
	case panelCompleted:
		return "Completed"
	case panelEvents:
		return "Events"
	default:
		return "Focus"
	}
}
