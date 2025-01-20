import type { ConnectionOptions, Connections } from '@/managers/types';
import { ClientLayer } from '@/managers/types';

/**
 * Manages Chrome runtime Port connections for different tabs and layers.
 */
export class ConnectionManager {
    /**
     * Stores active connections indexed by tabId and layer.
     * @private
     */
    private connections: Connections = {};

    /**
     * Adds a new connection (Port) for a given tab and layer.
     *
     * @param options - The connection options containing `layer` and `tabId`.
     * @param port    - The Chrome runtime port.
     */
    public addConnection(options: ConnectionOptions, port: chrome.runtime.Port): void {
        const { layer, tabId } = options;
        if (!this.connections[tabId]) {
            this.connections[tabId] = {
                [ClientLayer.DevTools]: undefined,
                [ClientLayer.Popup]: undefined,
                [ClientLayer.Options]: undefined,
            };
        }

        this.connections[tabId][layer] = port;
    }

    /**
     * Removes an existing connection for a given tab and layer.
     *
     * @param options - The connection options containing `layer` and `tabId`.
     */
    public removeConnection({ layer, tabId }: ConnectionOptions): void {
        const tabConnections = this.connections[tabId];
        if (tabConnections) {
            delete tabConnections[layer];

            if (Object.keys(tabConnections).length === 0) {
                delete this.connections[tabId];
            }
        }
    }

    /**
     * Retrieves a specific connection (Port) by tabId and layer.
     *
     * @param options - The connection options containing `layer` and `tabId`.
     * @returns The Chrome runtime port if available, otherwise undefined.
     */
    public getConnection({ layer, tabId }: ConnectionOptions): chrome.runtime.Port | undefined {
        return this.connections[tabId]?.[layer];
    }

    /**
     * Returns all active connections.
     *
     * @returns An object containing all tab connections.
     */
    public getAllConnections(): Connections {
        return this.connections;
    }
}
