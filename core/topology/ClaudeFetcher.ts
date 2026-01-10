import { Model } from "@indra/core"

export type ClaudeFetcher = {
  fetch: (content: string) => Promise<string | null>
}

export const ClaudeFetcher = (enabled: boolean, model: Model = "claude-haiku-4-5"): ClaudeFetcher => {

  const key = process.env.CLAUDE_API_KEY || ""

  const fetcher = {
    fetch: async (content: string) => {
      if (!key) return "Error: CLAUDE_API_KEY not set"

      if (!enabled) return null

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-beta": "web-fetch-2025-09-10"
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{
            role: "user",
            content
          }],
          tools: [
            {
              "type": "web_fetch_20250910",
              "name": "web_fetch",
              "max_uses": 1
            },
            {
              "type": "web_search_20250305",
              "name": "web_search",
              "max_uses": 1
            }
          ]
        })
      })

      const responseJSON = await response.json() as { content: { type: string, text: string }[] }

      let lastText = ""
      for (const part of responseJSON.content) {
        if (part.type === "text") {
          lastText = part.text
        }
      }

      return lastText
    }
  }

  return fetcher
}
