# To Do

## Now

Reimplement the IPC API.

- Depend on Electron `invoke` to return updates in response to events.
- When that's complete, replace Electron `invoke` with a platform-neutral layer e.g. as follows
- Ensure that menus are reconnected i.e. that OnClick results in UI update

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
- Implement - assembly details and call graphs for Core data -- see e.g. MORE/DETAILS.md

### Graph options

I deleted the old graph options -- they were as follows -- these are ideas which could be reimplemented

```ts
export type ShowClustered = { clusterBy: ClusterBy; nestedClusters: boolean };

export type ShowEdgeLabels = { groups: boolean; leafs: boolean };

export type References = {
  graphType: "references";
  nestedClusters: boolean; // one element from ShowClustered
};

export type Methods = {
  graphType: "methods";
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
  methodId?: NodeId; // should be MethodNodeId but don't want all the nodeIds types shared with the renderer
};

export type Apis = {
  graphType: "apis";
  showClustered: ShowClustered;
  showEdgeLabels: ShowEdgeLabels;
  showInternalCalls: boolean;
};

type CustomBase = {
  graphType: "custom";
  showEdgeLabels: ShowEdgeLabels;
  // these are extra/random strings in the CustomNode.tags array which can be used to filter which nodes are shown
  tags: { tag: string; shown: boolean }[];
};

type CustomAuto = CustomBase & {
  readonly isAutoLayers: true;
  // these are the names of layers defined in all CustomNode.layer property
  readonly layers: string[];
};

// this is used when the JSON is created by hand and contains semi-random properties
export type CustomManual = CustomBase & {
  readonly isAutoLayers: false;
  // these are extra/random properties added to CustomNode, any one of which can be used to specify layers
  nodeProperties: string[];
  // this optionally contains one element which the yser select from nodeProperties
  // it's an array so that if the UI were more complicated then the user could specify more than one level of layering
  clusterBy: string[];
};
```

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
