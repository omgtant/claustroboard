const globalError = document.getElementById("global-error");
const globalErrorMessage = document.getElementById("global-error-message");

export function showError(message: string) {
	globalErrorMessage!.textContent = message;
	if (globalError!.classList.contains("hide")) {
		globalError!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
	}
	globalError!.classList.remove("hide");
}

export function hideError() {
	globalError!.classList.add("hide");
}
