package tui

import "github.com/charmbracelet/lipgloss"

const (
	pendingColor    = "#F5B700"
	processingColor = "#00B7E8"
	completedColor  = "#62C940"
	vipColor        = "#C2185B"
	normalColor     = "#E9AE3D"
	idleColor       = "#555555"
	textColor       = "#F2F2F2"
	frameX          = 6
	logFrameX       = 6
)

var (
	appStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color(textColor))

	titleStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FFFFFF")).
			Bold(true).
			Align(lipgloss.Center).
			MarginBottom(1).
			MarginTop(1)

	pendingHeaderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#111111")).
				Background(lipgloss.Color(pendingColor)).
				Bold(true).
				Padding(0, 1)

	processingHeaderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#111111")).
				Background(lipgloss.Color(processingColor)).
				Bold(true).
				Padding(0, 1)

	completedHeaderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#111111")).
				Background(lipgloss.Color(completedColor)).
				Bold(true).
				Padding(0, 1)

	pendingTextStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color(pendingColor)).
				Bold(true)

	processingTextStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color(processingColor)).
				Bold(true)

	completedTextStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color(completedColor)).
				Bold(true)

	vipBadgeStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FFFFFF")).
			Background(lipgloss.Color(vipColor)).
			Bold(true).
			Padding(0, 1)

	normalBadgeStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#111111")).
				Background(lipgloss.Color(normalColor)).
				Bold(true).
				Padding(0, 1)

	idleBadgeStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FFFFFF")).
			Background(lipgloss.Color(idleColor)).
			Bold(true).
			Padding(0, 1)

	eventHeaderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#111111")).
				Background(lipgloss.Color("#D0D0D0")).
				Bold(true).
				Padding(0, 1)

	logPanelStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#CCCCCC")).
			Foreground(lipgloss.Color(textColor)).
			Padding(1, 2)

	helpStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#CCCCCC")).
			Bold(true).
			MarginTop(1).
			MarginBottom(1)

	keyStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("#FFFFFF")).
			Background(lipgloss.Color("#3A3A4A")).
			Bold(true).
			Padding(0, 1)
)

func panelStyle(contentWidth int, color string) lipgloss.Style {
	return lipgloss.NewStyle().
		Width(contentWidth+4).
		Height(16).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(lipgloss.Color(color)).
		Foreground(lipgloss.Color(textColor)).
		Padding(1, 2)
}
