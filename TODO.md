# To Do

## Now

Reimplement the IPC API.

Depend on Electron `invoke` to return updates in response to events.

When that's complete, replace Electron `invoke` with a platform-neutral layer e.g. as follows

```ts
class RpcClient {
  private pending = new Map<string, { resolve; reject; timer }>();

  constructor(
    private transport: Transport,
    private timeoutMs = 10000
  ) {}

  request(method: string, params: unknown): Promise<unknown> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      this.transport.send({ kind: "request", id, method, params });
    });
  }

  handleIncoming(message: Response) {
    const pending = this.pending.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result);
  }
}

class RpcServer {
  private handlers = new Map<string, (params: unknown) => Promise<unknown>>();

  register(method: string, handler: (params: unknown) => Promise<unknown>) {
    this.handlers.set(method, handler);
  }

  async handleIncoming(message: Request, transport: Transport) {
    const handler = this.handlers.get(message.method);
    try {
      const result = await handler?.(message.params);
      transport.send({ kind: "response", id: message.id, result });
    } catch (error) {
      transport.send({ kind: "response", id: message.id, error: { message: String(error) } });
    }
  }
}
```

## Near term

- Debug - hourglass and prevent overlapping input events from user
- Implement - webit api instead of setting em size to change zoom `const { webFrame } = require('electron'); webFrame.setZoomFactor(1.2);`
- Implement - add styles e.g. to distinguish synthetic groups from assemblies or namespaces
- Implement - assembly details and call graphs for Core data

## Other ideas to do sometime

### Backend alias

Create tsconfig.paths.json

Reference it using `extends` in the tsconfig.json of other projects like backend-test

Use it to define path aliases using `paths`

- `@contracts-app: ["./contracts/app"]`
- `@src-id: ["./src/id2"]`
- `@src-utils: ["./src/utils"]`

### https://github.com/caplin/FlexLayout

Use this to split the Electron window into areas.

## More

And `./MORE/*`
