🔥 **Indra** is an Event Processing system for AI agents. 

## Architecture
Graphs are defined as nodes with parent relationships and prompts.
Each node can optionally define a `seed` function for external input.

```ts
export type Graph = {
  id: string
  name: string
  nodes: Node[]
}

export type Node = {
  id: string
  parentId: string | null
  prompt: string
  seed?: () => Promise<string>
}
```

## Supported LLMs

Indra currently supports only Claude.

The `CLAUDE_API_KEY` must be provided in your environment.

## Development
```bash
bun install
bun dev
```

open `http://localhost:5000` to view the topology UI
