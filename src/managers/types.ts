/**
 * A unique identifier for a Chrome tab.
 */
export type TabId = number;

/**
 * The different layers (or contexts) within the extension.
 *
 * - `DevTools`: The DevTools panel context.
 * - `Popup`: The extension popup context.
 * - `Options`: The extension options page context.
 */
export enum ClientLayer {
    DevTools = 'devtools',
    Popup = 'popup',
    Options = 'options',
}

/**
 * A base interface representing a message structure.
 */
export interface BaseMessage {
    /** The type of the message. */
    type: string;
    /** The data payload of the message. */
    data: unknown;
}

/**
 * A listener function that handles `BaseMessage` objects.
 *
 * @param message     - The message being received.
 * @param senderPort  - The Chrome runtime port that sent the message (optional).
 * @returns A boolean, void, or undefined. (Often used to signal message consumption or early return.)
 */
export type BaseMessageListener = (
    message: BaseMessage,
    senderPort?: chrome.runtime.Port,
) => boolean | void | undefined;

/**
 * A record of all connections for a given tab, keyed by `ClientLayer`.
 */
export type Connections = Record<TabId, Record<ClientLayer, chrome.runtime.Port | undefined>>;

/**
 * A map of all message listeners, keyed by message type.
 */
export type Listeners = Map<string, Set<BaseMessageListener>>;

/**
 * Connection options used to identify a tab and a specific layer/context.
 */
export interface ConnectionOptions {
    /** The layer or context (DevTools, Popup, Options). */
    layer: ClientLayer;
    /** The ID of the tab to which we connect. */
    tabId: TabId;
}
