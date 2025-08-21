const globalError = document.getElementById("global-error");
const globalErrorMessage = document.getElementById("global-error-message");
let hideErrorTimeout: number | null = null;

export function showError(message: string) {
	globalErrorMessage!.textContent = message;
	if (globalError!.classList.contains("hide")) {
		globalError!.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 300,
		});
	}
	globalError!.classList.remove("hide");

	// Debounce auto-hide: reset timer to hide after 5s from last showError
	if (hideErrorTimeout !== null) clearTimeout(hideErrorTimeout);
	hideErrorTimeout = window.setTimeout(() => {
		hideError();
		hideErrorTimeout = null;
	}, 5000);
}

export function hideError() {
	// Clear pending auto-hide to avoid duplicate calls
	if (hideErrorTimeout !== null) {
		clearTimeout(hideErrorTimeout);
		hideErrorTimeout = null;
	}
	globalError!.classList.add("hide");
}
