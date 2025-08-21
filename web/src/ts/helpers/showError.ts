const globalError = document.getElementById("global-error");
const globalErrorMessage = document.getElementById("global-error-message");

export function showError(message: string) {
	globalErrorMessage!.textContent = message;
	globalError!.classList.remove("hide");
}

export function hideError() {
	globalError!.classList.add("hide");
}
