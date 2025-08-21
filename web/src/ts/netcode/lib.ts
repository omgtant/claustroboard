/**
 * WebSocket Connection Manager with TypeScript support
 *
 * Usage:
 * 1. Define your EventMap interface with event types and payloads
 * 2. Create an instance: const ws = new WebSocketManager<YourEventMap>()
 * 3. Connect: await ws.connect('ws://localhost:8080')
 * 4. Listen: ws.on('your:event', (data) => { ... })
 * 5. Send: ws.send('your:event', { payload })
 */

enum ConnectionState {
	CONNECTING = "connecting",
	CONNECTED = "connected",
	DISCONNECTING = "disconnecting",
	DISCONNECTED = "disconnected",
	ERROR = "error",
}

interface WebSocketConfig {
	maxReconnectAttempts?: number;
	heartbeatInterval?: number;
	connectionTimeout?: number;
	enableLogging?: boolean;
}

interface QueuedMessage<T extends Record<string, any>> {
	type: keyof T;
	data: any;
	timestamp: number;
}

class TypedEventEmitter<T extends Record<string, any>> {
	private listeners = new Map<keyof T, Set<Function>>();

	on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(listener);
	}

	off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
		this.listeners.get(event)?.delete(listener);
	}

	emit<K extends keyof T>(event: K, data: T[K]): void {
		this.listeners.get(event)?.forEach((listener) => {
			try {
				listener(data);
			} catch (error) {
				console.error(
					`Error in event listener for ${String(event)}:`,
					error
				);
			}
		});
	}

	removeAllListeners(event?: keyof T): void {
		if (event) {
			this.listeners.delete(event);
		} else {
			this.listeners.clear();
		}
	}
}

// Built-in system events that are always available
interface SystemEvents {
	"connection:open": {};
	"connection:close": { code: number; reason: string; wasClean: boolean };
	"connection:error": { error: Event | Error };
	ping: { timestamp: number };
	"connection:state-change": {
		state: ConnectionState;
		previousState: ConnectionState;
	};
}

export class WebSocketManager<
	TEventMap extends Record<string, any> = {}
> extends TypedEventEmitter<TEventMap & SystemEvents> {
	private ws: WebSocket | null = null;
	private state: ConnectionState = ConnectionState.DISCONNECTED;
	private previousState: ConnectionState = ConnectionState.DISCONNECTED;
	private reconnectAttempts = 0;
	private messageQueue: Array<QueuedMessage<TEventMap>> = [];
	private heartbeatInterval: number | null = null;
	private connectionTimeout: number | null = null;

	// Configuration
	private config: Required<WebSocketConfig> = {
		maxReconnectAttempts: 5,
		heartbeatInterval: 30000, // 30 seconds
		connectionTimeout: 300000, // 5 minutes
		enableLogging: false,
	};

	constructor(config?: WebSocketConfig) {
		super();
		if (config) {
			this.config = { ...this.config, ...config };
		}
	}

	/**
	 * Connect to WebSocket server
	 */
	async connect(url: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this.state === ConnectionState.CONNECTING || this.isConnected) {
				this.log("Connection already in progress or established");
				reject(
					new Error("Connection already in progress or established")
				);
			}
			this.setState(ConnectionState.CONNECTING);
			this.ws = new WebSocket(url);

			const onOpen = () => {
				cleanup();
				resolve();
			};

			const onError = (error: Event) => {
				cleanup();
				reject(new Error("WebSocket connection failed"));
			};

			const cleanup = () => {
				this.ws?.removeEventListener("open", onOpen);
				this.ws?.removeEventListener("error", onError);
			};

			this.ws.addEventListener("open", onOpen);
			this.ws.addEventListener("error", onError);
			this.setupEventHandlers();
		});
	}

	/**
	 * Disconnect from WebSocket server
	 */
	disconnect(): void {
		this.setState(ConnectionState.DISCONNECTING);

		// Clear timers
		this.clearTimers();

		// Clear message queue
		this.messageQueue.length = 0;

		// Close connection
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.close(1000, "Client disconnecting");
		}

		this.setState(ConnectionState.DISCONNECTED);
	}

	/**
	 * Send typed message
	 */
	send<K extends keyof TEventMap>(type: K, payload: TEventMap[K]): void {
		const message: QueuedMessage<TEventMap> = {
			type,
			data: payload,
			timestamp: Date.now(),
		};

		if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
			try {
				this.ws.send(JSON.stringify(message));
				this.log(`Sent message: ${String(type)}`, payload);
			} catch (error) {
				this.log(`Failed to send message: ${String(type)}`, error);
				this.messageQueue.push(message);
			}
		} else {
			this.log(`Queued message: ${String(type)}`, payload);
			this.messageQueue.push(message);
		}
	}

	/**
	 * Get current connection state
	 */
	get connectionState(): ConnectionState {
		return this.state;
	}

	/**
	 * Check if currently connected
	 */
	get isConnected(): boolean {
		return (
			this.state === ConnectionState.CONNECTED &&
			this.ws?.readyState === WebSocket.OPEN
		);
	}

	/**
	 * Get queued message count
	 */
	get queuedMessageCount(): number {
		return this.messageQueue.length;
	}

	private setupEventHandlers(): void {
		if (!this.ws) return;

		this.ws.onopen = () => {
			this.setState(ConnectionState.CONNECTED);
			this.reconnectAttempts = 0;
			this.flushMessageQueue();
			this.startHeartbeat();
			this.emit("connection:open", {} as TEventMap["connection:open"]);
			this.log("WebSocket connected");
		};

		this.ws.onmessage = (event) => {
			this.resetConnectionTimeout();

			try {
				const data = JSON.parse(event.data);
				this.handleMessage(data);
			} catch (error) {
				this.log("Failed to parse message:", error);
			}
		};

		this.ws.onerror = (error) => {
			this.setState(ConnectionState.ERROR);
			this.emit("connection:error", {
				error,
			} as TEventMap["connection:error"]);
			this.log("WebSocket error:", error);
		};

		this.ws.onclose = (event) => {
			const { code, reason, wasClean } = event;
			this.setState(ConnectionState.DISCONNECTED);
			this.clearTimers();

			this.emit("connection:close", {
				code,
				reason,
				wasClean,
			} as TEventMap["connection:close"]);
			this.log(`WebSocket closed: ${code} - ${reason}`);

			// Auto-reconnect on unexpected disconnection
			if (
				!wasClean &&
				this.reconnectAttempts < this.config.maxReconnectAttempts
			) {
				this.reconnect();
			}
		};
	}

	private handleMessage(data: any): void {
		if (!data || typeof data !== "object" || !data.type) {
			this.log("Invalid message format:", data);
			return;
		}

		const { type, data: payload } = data;

		// Handle system heartbeat
		if (type === "ping") {
			this.emit("ping", payload || { timestamp: Date.now() });
			return;
		}

		// Emit typed event
		this.emit(type as keyof TEventMap, payload);
		this.log(`Received message: ${type}`, payload);
	}

	private flushMessageQueue(): void {
		while (this.messageQueue.length > 0 && this.isConnected) {
			const message = this.messageQueue.shift()!;
			try {
				this.ws?.send(JSON.stringify(message));
				this.log(`Flushed queued message: ${String(message.type)}`);
			} catch (error) {
				this.log("Failed to flush message:", error);
				// Put message back at front of queue
				this.messageQueue.unshift(message);
				break;
			}
		}
	}

	private reconnect(): void {
		if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
			this.log("Max reconnection attempts reached");
			return;
		}

		const delay = Math.min(
			1000 * Math.pow(2, this.reconnectAttempts),
			30000
		);
		this.log(
			`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`
		);

		setTimeout(() => {
			this.reconnectAttempts++;
			// Note: You'll need to store the URL to reconnect
			// Consider adding a private url property if needed
		}, delay);
	}

	private startHeartbeat(): void {
		this.clearHeartbeat();
		if (this.config.heartbeatInterval <= 0) {
			this.log("Heartbeat disabled");
			return;
		} else {
			this.log(
				`Heartbeat interval set to ${this.config.heartbeatInterval}ms`
			);
		}
		this.heartbeatInterval = window.setInterval(() => {
			if (this.isConnected) {
				// Send heartbeat as system event
				try {
					this.ws?.send(
						JSON.stringify({
							type: "ping",
							payload: { timestamp: Date.now() },
							timestamp: Date.now(),
						})
					);
					this.resetConnectionTimeout();
				} catch (error) {
					this.log("Heartbeat failed:", error);
				}
			}
		}, this.config.heartbeatInterval);

		// Start connection timeout
		this.resetConnectionTimeout();
	}

	private resetConnectionTimeout(): void {
		if (this.connectionTimeout) {
			clearTimeout(this.connectionTimeout);
		}

		this.connectionTimeout = window.setTimeout(() => {
			this.log("Connection timeout - no activity received");
			this.disconnect();
		}, this.config.connectionTimeout);
	}

	private clearTimers(): void {
		this.clearHeartbeat();
		if (this.connectionTimeout) {
			clearTimeout(this.connectionTimeout);
			this.connectionTimeout = null;
		}
	}

	private clearHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	private setState(newState: ConnectionState): void {
		if (this.state !== newState) {
			this.previousState = this.state;
			this.state = newState;
			this.emit("connection:state-change", {
				state: newState,
				previousState: this.previousState,
			} as TEventMap["connection:state-change"]);
		}
	}

	private log(message: string, data?: any): void {
		if (this.config.enableLogging) {
			if (data) {
				console.log(`[WebSocketManager] ${message}`, data);
			} else {
				console.log(`[WebSocketManager] ${message}`);
			}
		}
	}

	/**
	 * Clean up resources when instance is no longer needed
	 */
	destroy(): void {
		this.disconnect();
		this.removeAllListeners();
	}
}

// Export types for convenience
export { ConnectionState, WebSocketConfig };
export type { SystemEvents };
