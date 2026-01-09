import { Graph } from "@indra/core"

export const demo: Graph = {
  id: "demo",
  name: "demo",
  nodes: [
    {
      id: "ingest",
      parentId: null,
      seed: async () => {
        const response = await fetch("https://en.wikipedia.org/wiki/special:random")
        return response.url
      },
      prompt: "go to the wikipedia page given in the seed and summarize its content in a short paragraph. respond only with the summary."
    },
    {
      id: "tag",
      parentId: "ingest",
      prompt: "Extract relevant tags from the summarized content. respond only with a comma separated list of tags."
    },
    // {
    //   id: "log",
    //   parentId: "tag",
    //   prompt: "log the extracted tags to the console."
    // }
  ]
}
