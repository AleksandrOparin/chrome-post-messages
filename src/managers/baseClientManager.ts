import type { Logger } from '@/logger/types';
import { ListenerManager } from '@/managers/listenerManager';
import type { BaseMessage, BaseMessageListener, ClientLayer } from '@/managers/types';

/**
 * A base class for managing client-side connections and message passing.
 */
export class BaseClientManager {
    /**
     * The Chrome runtime port associated with this client manager.
     * @protected
     */
    protected port: chrome.runtime.Port | null = null;

    /**
     * Manages message listeners.
     * @protected
     */
    protected listenerManager: ListenerManager;

    /**
     * A queue of messages to be sent once the port is initialized.
     * @private
     */
    private pendingMessages: BaseMessage[] = [];

    /**
     * @param layer  - The client layer or context (e.g., DevTools, Popup, Options).
     * @param logger - A logger instance for this client manager.
     */
    constructor(
        private layer: ClientLayer,
        private logger: Logger,
    ) {
        this.listenerManager = new ListenerManager(logger);
    }

    /**
     * Subscribes to a specific message type with a listener function.
     *
     * @param type     - The message type to subscribe to.
     * @param listener - The listener function handling messages of that type.
     * @returns A function that unsubscribes the listener when called.
     */
    public subscribe(type: string, listener: BaseMessageListener): () => void {
        return this.listenerManager.subscribe(type, listener);
    }

    /**
     * Sends a message. If the port is not yet available, the message is queued
     * and sent once the port is established.
     *
     * @param message - The message to be sent.
     */
    public sendMessage(message: BaseMessage): void {
        if (!this.port) {
            this.pendingMessages.push(message);
            this.initPort();
        } else {
            this.port.postMessage(message);
        }
    }

    /**
     * Initializes the Chrome runtime port connection if not already established.
     * @private
     */
    private initPort(): void {
        if (this.port) {
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const tabId = tabs[0]?.id;
            if (!tabId) {
                this.logger.error(`No tabs found for ${this.layer} manager`);

                return;
            }

            this.port = chrome.runtime.connect({ name: `${this.layer}:${tabId}` });

            this.port.onMessage.addListener(this.handleIncomingMessage.bind(this));
            this.port.onDisconnect.addListener(this.handlePortDisconnect.bind(this));

            this.logger.info(`Manager for ${this.layer} initialized`, { tabId });

            this.flushPendingMessages();
        });
    }

    /**
     * Handles incoming messages from the connected port and notifies listeners.
     *
     * @param message - The received message.
     */
    private handleIncomingMessage(message: BaseMessage): void {
        if (!this.port) {
            return;
        }

        this.listenerManager.notify(message, this.port);
    }

    /**
     * Handles the event when the port is disconnected.*
     */
    private handlePortDisconnect({ name }: chrome.runtime.Port): void {
        this.logger.info('Port disconnected', { portName: name });
        this.listenerManager.clear();
        this.port = null;
    }

    /**
     * Flushes any pending messages to the port after it has been initialized.
     * @private
     */
    private flushPendingMessages(): void {
        if (!this.port) {
            return;
        }

        this.pendingMessages.forEach(message => this.port?.postMessage(message));
        this.pendingMessages = [];
    }
}
