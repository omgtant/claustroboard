package routers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"omgtant/claustroboard/shared/config"
)

type Feedback struct {
	Contact string `json:"contact"`
	Feedback string `json:"feedback"`
}

func PostFeedback(w http.ResponseWriter, r *http.Request) {
	var feedback Feedback
	if err := json.NewDecoder(r.Body).Decode(&feedback); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if len(feedback.Contact) > 255 {
		http.Error(w, "Contact is too long (max 255 characters)", http.StatusBadRequest)
		return
	}
	
	if err := sendFeedbackToDiscord(feedback); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type DiscordWebhookMessage struct {
	Content string `json:"content"`
}

func sendFeedbackToDiscord(feedback Feedback) error {
	config := config.Get()
	url := config.DISCORD_FEEDBACK_WEBHOOK_URL

	head := fmt.Sprintf("User contact: ||%s||\nFeedback:\n", escapeMarkdown(feedback.Contact));
	body := []string{}
	body = append(body, head)
	// Append the body[0] up to 1999 symbols
	headLen := len(head)
	sliceSize := min(1999-headLen, len(feedback.Feedback))
	body[0] = body[0] + feedback.Feedback[:sliceSize]
	feedback.Feedback = feedback.Feedback[sliceSize:]

	for len(feedback.Feedback) > 0 {
		if len(feedback.Feedback) <= 1999 {
			body = append(body, feedback.Feedback)
			break
		}

		body = append(body, feedback.Feedback[:1999])
		feedback.Feedback = feedback.Feedback[1999:]
	}

	for _, part := range body {
		message := DiscordWebhookMessage{
			Content: part,
		}
		messageJson, err := json.Marshal(message)
		if err != nil {
			return err
		}

		_, err = http.Post(url, "application/json", bytes.NewBuffer(messageJson))
		if err != nil {
			return err
		}
	}

	return nil
}

func escapeMarkdown(text string) string {
	isSpecial := func(r rune) bool {
		switch r {
		case '*', '_', '`', '~', '\\', '|':
			return true
		default:
			return false
		}
	}

	// Unescape any backslashed special character
	rs := []rune(text)
	unescaped := make([]rune, 0, len(rs))
	for i := 0; i < len(rs); i++ {
		r := rs[i]
		if r == '\\' && i+1 < len(rs) && isSpecial(rs[i+1]) {
			unescaped = append(unescaped, rs[i+1])
			i++
			continue
		}
		unescaped = append(unescaped, r)
	}

	// Escape special characters
	escaped := make([]rune, 0, len(unescaped)*2)
	for _, r := range unescaped {
		if isSpecial(r) {
			escaped = append(escaped, '\\', r)
		} else {
			escaped = append(escaped, r)
		}
	}

	return string(escaped)
}