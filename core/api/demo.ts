import { Graph } from "@indra/core"

export const demo: Graph = {
  id: "demo",
  name: "demo",
  nodes: [
    {
      id: "ingest",
      seed: async () => {
        const response = await fetch("https://en.wikipedia.org/wiki/special:random")
        return response.url
      },
      prompt: "go to the wikipedia page given in the seed and summarize its content in a short paragraph. respond only with the summary.",
      children: [
        {
          id: "tag",
          prompt: "Extract relevant tags from the summarized content. respond only with a comma separated list of tags.",
          children: [
            {
              id: "log",
              prompt: "log the extracted tags to the console."
            }
          ]
        },
        {
          id: "suggestion",
          prompt: "suggest three related topics that might interest the reader. respond only with a comma separated list of topics."
        }
      ]
    }
  ]
}
