import { ClaudeFetcher } from "@indra/core"

export type Node = {
  id: string
  prompt: string
  children?: Node[]
  seed?: () => Promise<string>
  processed?: number
}

export type Message = {
  read: boolean
  from: string
  text: string
}

export type ProcessingEvent = {
  nodeId: string
  startedAt: number
  durationMs: number
  inputMessage?: string
  outputMessage?: string
}

export type NodeWorker = Node & {
  processed: number
  process: (message: Message | null) => Promise<Message | void>
}

export const NodeWorker = (
  node: Node,
  onEvent?: (event: ProcessingEvent) => void
): NodeWorker => {

  const claude = ClaudeFetcher(false)

  const worker = {
    ...node,
    processed: 0,
    process: async (message: Message | null) => {
      const startedAt = Date.now()
      worker.processed += 1

      let seed = ""
      if (node.seed) seed = await node.seed()

      const prompt = node.prompt
      const response = await claude.fetch(
        `prompt:${prompt}; ${ message ? `message:${message.text}` : "" }; ${ seed ? `seed:${seed};` : "" }`
      )

      const durationMs = Date.now() - startedAt
      onEvent?.({
        nodeId: node.id,
        startedAt,
        durationMs,
        inputMessage: message?.text,
        outputMessage: response ?? undefined
      })

      console.log({ id: node.id, prompt, message, seed, response })

      if (!response) return

      return {
        read: false,
        from: node.id,
        text: response
      }
    }
  }

  return worker
}
