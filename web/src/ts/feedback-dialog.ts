import { showError } from "./helpers/showError";

//#region DOM elements
const showBtn = document.getElementById("show-feedback-dialog") as HTMLButtonElement;
const closeBtn = document.getElementById("close-feedback-btn") as HTMLButtonElement;

const feedbackDialog = document.getElementById("feedback-dialog") as HTMLDialogElement;
const feedbackContact = document.getElementById("feedback-contact") as HTMLInputElement;
const feedbackFeedback = document.getElementById("feedback-feedback") as HTMLTextAreaElement;
const feedbackSubmit = document.getElementById("feedback-submit") as HTMLButtonElement;
//#endregion

export function initFeedbackDialog() {
    
    showBtn.addEventListener("click", () => {
        feedbackDialog.showModal();
    });

    closeBtn.addEventListener("click", () => {
        feedbackDialog.close();
    });

    feedbackSubmit.addEventListener("click", async (event) => {
        event.preventDefault();
    
        const contact = feedbackContact.value;
        const feedback = feedbackFeedback.value;
    
        // Send feedback to the server
        fetch("/api/v1/feedback", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ contact, feedback }),
        }).then((response) => {
            if (response.ok) {
				feedbackDialog.close();
			} else {
				feedbackDialog.close();
				showError("Failed to submit feedback. Sorry!");
			}
        }).catch((error) => {
    		feedbackDialog.close();
    		showError("Failed to submit feedback. Sorry!");
    	});
    });
}