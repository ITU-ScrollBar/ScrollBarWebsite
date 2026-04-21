export class Dinic {
  private readonly nodeIds = new Map<string, number>();
  private readonly nodeNames: string[] = [];
  private readonly graph: Array<Array<{ to: number; rev: number; cap: number }>> = [];

  private ensureNode(name: string): number {
    const existing = this.nodeIds.get(name);
    if (existing !== undefined) {
      return existing;
    }
    const id = this.nodeNames.length;
    this.nodeIds.set(name, id);
    this.nodeNames.push(name);
    this.graph.push([]);
    return id;
  }

  addEdge(from: string, to: string, cap: number): number {
    const fromId = this.ensureNode(from);
    const toId = this.ensureNode(to);

    const forward = { to: toId, rev: this.graph[toId].length, cap };
    const backward = { to: fromId, rev: this.graph[fromId].length, cap: 0 };

    this.graph[fromId].push(forward);
    this.graph[toId].push(backward);

    return this.graph[fromId].length - 1;
  }

  getEdge(from: string, edgeIndex: number): { to: number; rev: number; cap: number } | null {
    const fromId = this.nodeIds.get(from);
    if (fromId === undefined) {
      return null;
    }
    return this.graph[fromId][edgeIndex] ?? null;
  }

  private bfs(sourceId: number, sinkId: number, level: number[]): boolean {
    level.fill(-1);
    level[sourceId] = 0;

    const queue: number[] = [sourceId];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      for (const edge of this.graph[current]) {
        if (edge.cap > 0 && level[edge.to] < 0) {
          level[edge.to] = level[current] + 1;
          queue.push(edge.to);
        }
      }
    }

    return level[sinkId] >= 0;
  }

  private dfs(
    current: number,
    sink: number,
    flow: number,
    level: number[],
    work: number[]
  ): number {
    if (current === sink) {
      return flow;
    }

    for (; work[current] < this.graph[current].length; work[current] += 1) {
      const edge = this.graph[current][work[current]];
      if (edge.cap <= 0 || level[edge.to] !== level[current] + 1) {
        continue;
      }

      const pushed = this.dfs(edge.to, sink, Math.min(flow, edge.cap), level, work);
      if (pushed > 0) {
        edge.cap -= pushed;
        this.graph[edge.to][edge.rev].cap += pushed;
        return pushed;
      }
    }

    return 0;
  }

  maxFlow(source: string, sink: string): number {
    const sourceId = this.ensureNode(source);
    const sinkId = this.ensureNode(sink);

    let totalFlow = 0;
    const level = new Array(this.graph.length).fill(-1);

    while (this.bfs(sourceId, sinkId, level)) {
      const work = new Array(this.graph.length).fill(0);
      while (true) {
        const pushed = this.dfs(sourceId, sinkId, Number.MAX_SAFE_INTEGER, level, work);
        if (pushed === 0) {
          break;
        }
        totalFlow += pushed;
      }
    }

    return totalFlow;
  }
}
