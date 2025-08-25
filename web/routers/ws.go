package routers

import "encoding/json"

type event struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

type inboundEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data,omitempty"`
}