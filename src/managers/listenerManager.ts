import type { Logger } from '@/logger/types';
import type { BaseMessage, BaseMessageListener, Listeners } from '@/managers/types';

/**
 * Manages message listeners for various message types.
 */
export class ListenerManager {
    /**
     * A map of message types to sets of listener functions.
     * @private
     */
    private listeners: Listeners = new Map();

    /**
     * @param logger - A logger instance for logging warnings or errors.
     */
    constructor(private logger: Logger) {}

    /**
     * Subscribes a listener function for a specific message type.
     *
     * @param type     - The message type to subscribe to.
     * @param listener - The callback function that handles the specified message type.
     * @returns A function that, when called, unsubscribes this listener.
     */
    public subscribe(type: string, listener: BaseMessageListener): () => void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }

        const listeners = this.listeners.get(type)!;
        listeners.add(listener);

        return () => {
            listeners.delete(listener);

            if (listeners.size === 0) {
                this.listeners.delete(type);
            }
        };
    }

    /**
     * Notifies all subscribed listeners of a given message.
     *
     * @param message    - The message to dispatch.
     * @param senderPort - The port that sent this message (optional).
     */
    public notify(message: BaseMessage, senderPort?: chrome.runtime.Port): void {
        const listeners = this.listeners.get(message.type);
        if (!listeners) {
            this.logger.warn('Not listened port event', {
                portName: senderPort?.name,
                type: message.type,
            });

            return;
        }

        for (const listener of listeners) {
            try {
                listener(message, senderPort);
            } catch (error) {
                this.logger.error('Listener error:', error);
            }
        }
    }

    /**
     * Clears all registered listeners.
     */
    public clear(): void {
        this.listeners.clear();
    }
}
