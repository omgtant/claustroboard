const globalError = document.getElementById("global-error");
const globalErrorMessage = document.getElementById("global-error-message");

function showError(message: string) {
	globalErrorMessage!.textContent = message;
	globalError!.classList.remove("hide");
}

function hideError() {
	globalError!.classList.add("hide");
}
