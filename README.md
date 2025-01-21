# 🚀 Chrome Extension Message Manager

A robust and type-safe messaging system for Chrome extensions. This package helps you manage communication between various extension contexts (DevTools, Popup, Options, Background) using a simple publish/subscribe pattern, all while providing a centralized logging mechanism.

---

## Table of Contents
1. [Features](#features)
2. [Installation](#installation)
3. [Usage](#usage)
    - [Background Script](#background-script)
    - [Client Scripts (DevTools, Popup, Options)](#client-scripts-devtools-popup-options)
    - [Subscribing and Sending Messages](#subscribing-and-sending-messages)
4. [API Overview](#api-overview)
    - [BaseBackgroundManager](#basebackgroundmanager)
    - [BaseClientManager](#baseclientmanager)
    - [ListenerManager](#listenermanager)
    - [ConnectionManager](#connectionmanager)
    - [Types](#types)
5. [Logging](#logging)
6. [Contributing](#contributing)
7. [License](#license)

---

## Features

- **🔥 Easy Communication:** Seamlessly send typed messages between background, popup, options, and devtools contexts.
- **🎛️ Organized Subscriptions:** Subscribe to specific message types using a `ListenerManager`.
- **🏷️ Type-Safe Messages:** Define your own message types with payloads to ensure robust and predictable communication.
- **💡 Simple Logging Interface:** Plug in your own logger to handle info, warn, and error logs.
- **♻️ Automatic Cleanup:** Connections and listeners are cleaned up on disconnection.

---

## Installation

```bash
  npm install --save chrome-post-messages
```
Or, if you prefer Yarn:
```bash
  yarn add chrome-post-messages
```

---

## Usage

### Background Script

In your extension's **background** script (often `background.js` or `background.ts`):

```ts
import { BaseBackgroundManager } from 'your-package-name';
import { myLogger } from './myLogger'; // Your custom logger

const bgManager = new BaseBackgroundManager(myLogger);

// Subscribe to a particular message type
bgManager.subscribe('USER_LOGGED_IN', (message) => {
  myLogger.info('Received USER_LOGGED_IN in background', message.data);

  // Optionally, broadcast a message to all connected contexts
  bgManager.sendMessage({}, {
    type: 'SHOW_GREETING',
    data: { text: 'Hello from Background!' }
  });
});
```

### Client Scripts (DevTools, Popup, Options)

In DevTools, Popup, or Options scripts, use the BaseClientManager to manage the port connection:

```ts
import { BaseClientManager } from 'your-package-name';
import { ClientLayer } from 'your-package-name';
import { myLogger } from './myLogger'; // Your custom logger

const devtoolsManager = new BaseClientManager(ClientLayer.DevTools, myLogger);

// Subscribe to incoming messages
devtoolsManager.subscribe('SHOW_GREETING', (message) => {
  console.log('Greeting from background:', message.data);
});

// Send a message to the background
devtoolsManager.sendMessage({
  type: 'USER_LOGGED_IN',
  data: { userId: 123, userName: 'John Doe' },
});
```

**Note:** each `BaseClientManager` instance automatically creates a Chrome runtime connection named `<layer>:<tabId>` (for example, `devtools:123`).

### With better typing

Also, you can create your own classes with:

- Better typing for post messages.
- Some extra logic.

Example for strong typing in classes:

```ts
/**
 * types.ts
 */
enum MessageType {
    MESSAGE = 'message',
}

export interface MessageMap {
    [MessageType.MESSAGE]: { text: string };
}

export interface Message<T extends keyof MessageMap = keyof MessageMap> {
    type: T;
    data: MessageMap[T];
}

export interface MessageListener<T extends MessageType = MessageType> {
    (message: Message<T>, senderPort: chrome.runtime.Port): boolean | void | undefined;
}

/**
 * backgroundManager.ts
 */
class BackgroundManager extends BaseBackgroundManager {
    constructor() {
        super(logger);
    }
    
    public subscribeTyped<T extends MessageType>(
        type: T,
        listener: MessageListener<T>,
    ): () => void {
        return this.subscribe(type, listener);
    }
    
    public sendMessageTyped<T extends MessageType>(
        options: Partial<ConnectionOptions>,
        message: Message<T>,
    ): void {
        this.sendMessage(options, message);
    }
}

export default new BackgroundManager();

/**
 * clientManager.ts
 */
export abstract class ClientManager extends BaseClientManager {
    protected constructor(layer: ClientLayer) {
        super(layer, logger);
    }
    
    public subscribeTyped<T extends MessageType>(
        type: T,
        listener: MessageListener<T>,
    ): () => void {
        return this.subscribe(type, listener);
    }
    
    public sendMessageTyped<T extends MessageType>(message: Message<T>): void {
        this.sendMessage(message);
    }
}
```

### Subscribing and Sending Messages

- **Subscribing**  
  Use `.subscribe(type, listener)` on any manager (either `BaseBackgroundManager` or `BaseClientManager`) to listen for messages of a particular `type`.

- **Sending**
  - In `BaseBackgroundManager`, use `.sendMessage(connectionOptions, message)` to broadcast messages to specific tabs/layers or all.
  - In `BaseClientManager`, call `.sendMessage(message)` to dispatch a message to the background.

---

## API Overview

### BaseBackgroundManager

- **Purpose**: Manages connections from client scripts (DevTools, Popup, Options).  
- **Key Methods**:  
  - `constructor(logger: Logger)`: Accepts a custom logger.  
  - `subscribe(type: string, listener: BaseMessageListener)`: Subscribes to a message type.  
  - `sendMessage(options: Partial<ConnectionOptions>, message: BaseMessage)`: Sends a message to one, many, or all connections.  
- **Events**:  
  - Automatically handles `chrome.runtime.onConnect` to register new ports.

### BaseClientManager

- **Purpose**: Manages a single client (DevTools, Popup, or Options) and its communication with the background script.  
- **Key Methods**:  
  - `constructor(layer: ClientLayer, logger: Logger)`: Provide the specific layer context and logger.  
  - `subscribe(type: string, listener: BaseMessageListener)`: Subscribes to a message type.  
  - `sendMessage(message: BaseMessage)`: Sends a message to the background script.

### ListenerManager

- **Purpose**: Handles subscription and notification logic for messages.  
- **Key Methods**:  
  - `subscribe(type: string, listener: BaseMessageListener)`: Returns an unsubscribe function.  
  - `notify(message: BaseMessage, senderPort?: chrome.runtime.Port)`: Invokes all listeners subscribed to `message.type`.  
  - `clear()`: Clears all subscribed listeners.

### ConnectionManager

- **Purpose**: Maintains a record of active Chrome runtime ports by tab ID and layer.  
- **Key Methods**:  
  - `addConnection(options: ConnectionOptions, port: chrome.runtime.Port)`: Store a new port.  
  - `removeConnection(options: ConnectionOptions)`: Remove an existing port.  
  - `getConnection(options: ConnectionOptions)`: Retrieve a port by layer and tab ID.  
  - `getAllConnections()`: Retrieve the entire connection registry.

### Types

- **`BaseMessage`**: Core message structure with `type` and `data`.
- **`BaseMessageListener`**: Function signature for handling messages.
- **`ConnectionOptions`**: Contains `tabId` (number) and `layer` (`DevTools`, `Popup`, or `Options`).
- **`ClientLayer`**: Enum representing the extension context: `DevTools`, `Popup`, or `Options`.

---

## Logging

All classes expect a `Logger` that implements:

```ts
export interface Logger {
  info: (text: string, details?: any) => void;
  warn: (text: string, details?: any) => void;
  error: (text: string, details?: any) => void;
}
```

You can integrate your favorite logging library or create a simple custom logger:

```ts
export const myLogger: Logger = {
  info: (msg, details) => console.log('[INFO]', msg, details),
  warn: (msg, details) => console.warn('[WARN]', msg, details),
  error: (msg, details) => console.error('[ERROR]', msg, details)
};
```

---

## Contributing

👨‍💻 **Contributions are welcome!**

1. [Fork](https://github.com/your-repo/your-package/fork) this repository.  
2. Create a new branch for your feature/fix:
```bash
  git checkout -b feature/my-feature
```
3. Commit your changes:
```bash
  git commit -m "Add new feature"
```
4. Push to the branch:
```bash
    git push origin feature/my-feature
```
5. Create a Pull Request.

---

## License

**📜 MIT License**

Feel free to use, modify, and distribute this project as allowed by the license.

Made with 🧡 by Aleksandr and the open-source community!
