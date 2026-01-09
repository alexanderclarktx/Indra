export type Node = {
  id: string
  parentId: string | null
  prompt: string
}

export type Message = {
  read: boolean
  from: string
  text: string
}

export type NodeWorker = Node & {
  process: (message: Message | null) => Message | void
}

export const NodeWorker = (node: Node): NodeWorker => {
  return {
    ...node,
    process: (message: Message | null) => {

      if (node.id === "ingest") {
        return {
          read: false,
          from: "ingest",
          text: "The Bonomi BS.8 Biancone was an Italian single-seat training glider developed in the 1930s as a higher-performance evolution of the earlier BS.7 Allievo Italia primary glider. Designed and built by Aeronautica Bonomi, the BS.8 featured a more advanced high-aspect-ratio wing, an enclosed cockpit nacelle instead of an open girder frame, and conventional glider structural improvements to enhance flight characteristics. First flown around 1933, only six of these aircraft were built, and for a period one was modified with floats to allow tow launching from water. It served as a trainer to help pilots transition from basic gliders to more capable sailplanes."
        }
      }

      if (node.id === "tag") {
        return {
          read: false,
          from: "tag",
          text: "glider, training glider, Italian aircraft, 1930s aviation, Aeronautica Bonomi, BS.8 Biancone, sailplane trainer"
        }
      }

      if (node.id === "log") {
        console.log("log:", message?.text)
      }
    }
  }
}
