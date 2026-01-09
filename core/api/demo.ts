import { Graph } from "@indra/core"

export const demo: Graph = {
  id: "demo",
  name: "demo",
  nodes: [
    {
      id: "ingest",
      parentId: null,
      prompt: "go to a random wikipedia page (https://en.wikipedia.org/wiki/special:random) and summarize the content in a few sentences."
    },
    {
      id: "tag",
      parentId: "ingest",
      prompt: "Extract relevant tags from the summarized content."
    },
    {
      id: "log",
      parentId: "tag",
      prompt: "log the extracted tags to the console."
    }
  ]
}
