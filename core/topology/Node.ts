import { ClaudeFetcher } from "@indra/core"

export type Node = {
  id: string
  parentId: string | null
  prompt: string
  seed?: () => Promise<string>
  processed?: number
}

export type Message = {
  read: boolean
  from: string
  text: string
}

export type NodeWorker = Node & {
  processed: number
  process: (message: Message | null) => Promise<Message | void>
}

export const NodeWorker = (node: Node): NodeWorker => {

  const claude = ClaudeFetcher(true)

  const worker = {
    ...node,
    processed: 0,
    process: async (message: Message | null) => {
      worker.processed += 1

      let seed = ""
      if (node.seed) seed = await node.seed()

      const prompt = node.prompt
      const response = await claude.fetch(
        `prompt:${prompt}; ${ message ? `message:${message.text}` : "" }; ${ seed ? `seed:${seed};` : "" }`
      )

      console.log({ id: node.id, prompt, message, seed, response })

      return {
        read: false,
        from: node.id,
        text: response
      }
    }
  }

  return worker
}
