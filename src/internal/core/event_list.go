package core

type EventList []Event

func NewEventList(events ...Event) EventList {
	return EventList(events)
}

func (l EventList) Append(event Event) EventList {
	return append(l, event)
}

func (l EventList) AppendAll(events EventList) EventList {
	return append(l, events...)
}
