import type { Logger } from '@/logger/types';
import { ConnectionManager } from '@/managers/connectionManager';
import { ListenerManager } from '@/managers/listenerManager';
import type { BaseMessage, BaseMessageListener, ConnectionOptions } from '@/managers/types';
import { ClientLayer } from '@/managers/types';

/**
 * A base class for the background script to manage connections and broadcast messages.
 */
export class BaseBackgroundManager {
    /**
     * Manages connections for different tabs and layers.
     * @protected
     */
    protected connectionManager: ConnectionManager;

    /**
     * Manages message listeners subscribed to the background script.
     * @protected
     */
    protected listenerManager: ListenerManager;

    /**
     * @param logger - A logger instance for logging within the background manager.
     */
    constructor(private logger: Logger) {
        this.connectionManager = new ConnectionManager();
        this.listenerManager = new ListenerManager(logger);

        chrome.runtime.onConnect.addListener(this.handleConnection.bind(this));
    }

    /**
     * Subscribes a listener to a specific message type.
     *
     * @param type     - The message type to subscribe to.
     * @param listener - The listener function handling messages of that type.
     * @returns A function that unsubscribes the listener when called.
     */
    public subscribe(type: string, listener: BaseMessageListener): () => void {
        return this.listenerManager.subscribe(type, listener);
    }

    /**
     * Sends a message to a particular tab and/or layer. If neither are specified,
     * it sends to all open connections.
     *
     * @param options - Partial connection options (`tabId` and/or `layer`).
     * @param message - The message to send.
     */
    public sendMessage({ tabId, layer }: Partial<ConnectionOptions>, message: BaseMessage): void {
        const allConnections = this.connectionManager.getAllConnections();

        // Determine which tabIds to iterate
        const tabIds =
            tabId !== undefined
                ? [tabId] // single tab
                : Object.keys(allConnections).map(Number); // all tabs

        // For each tabId, determine which layers to iterate
        for (const tid of tabIds) {
            const layersRecord = allConnections[tid];
            if (!layersRecord) {
                // No connections for this tab; skip
                continue;
            }

            // If a specific layer is provided => single layer
            // otherwise => all layers in this tab
            const targetLayers =
                layer !== undefined ? [layer] : (Object.keys(layersRecord) as ClientLayer[]);

            // Send the message to each chosen layer in this tab
            for (const ly of targetLayers) {
                const port = layersRecord[ly];
                port?.postMessage(message);
            }
        }
    }

    /**
     * Handles a new connection made to the background script.
     *
     * @param port - The Chrome runtime port.
     * @private
     */
    private handleConnection(port: chrome.runtime.Port): void {
        const connectionDetails = this.extractPortDetails(port);
        if (!connectionDetails) {
            this.logger.error('Invalid port data or format, expected {layer}:{tabId}', port);

            return;
        }

        this.connectionManager.addConnection(connectionDetails, port);

        this.logger.info('Port connected', connectionDetails);

        port.onMessage.addListener((msg: BaseMessage) => {
            this.listenerManager.notify(msg, port);
        });
        port.onDisconnect.addListener(() => this.handlePortDisconnect(connectionDetails));
    }

    /**
     * Handles port disconnection events.
     *
     * @param connectionOptions - Information about the disconnected connection.
     * @private
     */
    private handlePortDisconnect(connectionOptions: ConnectionOptions): void {
        this.logger.info('Port disconnected', connectionOptions);
        this.connectionManager.removeConnection(connectionOptions);
    }

    /**
     * Extracts layer and tab ID information from the port name.
     *
     * @param port - The connected Chrome runtime port.
     * @returns Connection options if valid, otherwise `undefined`.
     * @private
     */
    private extractPortDetails(port: chrome.runtime.Port): ConnectionOptions | undefined {
        const [layer, tabId] = port.name.split(':') as [ClientLayer, string];
        const numericTabId = Number(tabId);

        if (!Object.values(ClientLayer).includes(layer) || isNaN(numericTabId)) {
            return undefined;
        }

        return { layer, tabId: numericTabId };
    }
}
