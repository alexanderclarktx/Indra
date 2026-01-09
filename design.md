`Graph` is an event-processing system that uses AI agents. Each Graph instance is a Bun application.

## architecture

Each instance of Graph is a DAG defined by nodes. Each node either calls an agent or invokes TypeScript code.

```ts
type Node<T extends "agent" | "code"> = {
  id: string,
  parent: string,
  type: T
}

type AgentNode = Node<"agent"> & {
  prompt: string
}

type CodeNode = Node<"code"> & {
  code: () => void
}
```

## front-end

The front-end is a simple web interface showing an entire Graph with configurable nodes. It is served by the Graph instance itself.

You can watch a Graph work in real-time.
- audit logs of every invocation
- live metrics of messages travelling through the Graph
