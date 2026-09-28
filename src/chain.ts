import type { ChainResult } from "./types.js";
import { validateFragments } from "./validator.js";
import { readAndParseFile, readAndParseFileSync } from "./parser.js";

/**
 * Constructs the final chained string sequence from an array of fragment indices.
 *
 * @param fragments - The original fragment array.
 * @param path - The sequence of indices forming the chain.
 * @returns The concatenated sequence string.
 */
export function buildSequenceFromPath(fragments: readonly string[], path: readonly number[]): string {
  if (path.length === 0) {
    return "";
  }

  const firstIndex = path[0]!;
  let sequence = fragments[firstIndex]!;

  for (let i = 1; i < path.length; i++) {
    const nextIndex = path[i]!;
    sequence += fragments[nextIndex]!.slice(2);
  }

  return sequence;
}

/**
 * Bitset helper for up to 256 vertices using BigInt for fast bitwise ops.
 */
function popcountBigInt(b: bigint): number {
  let count = 0;
  let temp = b;
  while (temp > 0n) {
    temp &= temp - 1n;
    count++;
  }
  return count;
}

/**
 * Checks if a directed graph is a DAG (has no directed cycles) using Tarjan's / DFS cycle detection.
 * If it is a DAG, returns a valid topological order. Otherwise returns null.
 */
function getTopologicalOrderIfDAG(n: number, adj: number[][]): number[] | null {
  const inDegree = new Int32Array(n);
  for (let u = 0; u < n; u++) {
    const neighbors = adj[u]!;
    for (let k = 0; k < neighbors.length; k++) {
      inDegree[neighbors[k]!]!++;
    }
  }

  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) {
      queue.push(i);
    }
  }

  const order: number[] = [];
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++]!;
    order.push(u);
    const neighbors = adj[u]!;
    for (let k = 0; k < neighbors.length; k++) {
      const v = neighbors[k]!;
      inDegree[v]!--;
      if (inDegree[v] === 0) {
        queue.push(v);
      }
    }
  }

  if (order.length === n) {
    return order;
  }
  return null;
}

/**
 * Finds the longest path in a Directed Acyclic Graph (DAG) in O(V + E) time using Dynamic Programming.
 */
function findLongestPathInDAG(n: number, adj: number[][], topoOrder: number[]): number[] {
  // dp[u] stores the length of the longest path starting at u
  const dp = new Int32Array(n).fill(1);
  const nextNode = new Int32Array(n).fill(-1);

  // Traverse in reverse topological order
  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const u = topoOrder[i]!;
    const neighbors = adj[u]!;
    let maxNext = 0;
    let bestV = -1;

    for (let k = 0; k < neighbors.length; k++) {
      const v = neighbors[k]!;
      if (dp[v]! > maxNext) {
        maxNext = dp[v]!;
        bestV = v;
      }
    }

    if (bestV !== -1) {
      dp[u] = 1 + maxNext;
      nextNode[u] = bestV;
    }
  }

  // Find the start node with the maximum dp value
  let bestStart = 0;
  let maxLen = 0;
  for (let i = 0; i < n; i++) {
    if (dp[i]! > maxLen) {
      maxLen = dp[i]!;
      bestStart = i;
    }
  }

  // Reconstruct path
  const path: number[] = [];
  let curr = bestStart;
  while (curr !== -1) {
    path.push(curr);
    curr = nextNode[curr]!;
  }

  return path;
}

/**
 * Computes reachability bitmask for each node using transitive closure.
 * reachMask[u] has the i-th bit set if node i is reachable from node u.
 */
function computeReachabilityMasks(n: number, adj: number[][]): bigint[] {
  const reach = new Array<bigint>(n);
  for (let i = 0; i < n; i++) {
    let mask = 1n << BigInt(i);
    const neighbors = adj[i]!;
    for (let k = 0; k < neighbors.length; k++) {
      mask |= 1n << BigInt(neighbors[k]!);
    }
    reach[i] = mask;
  }

  // Warshall's algorithm for transitive closure
  for (let k = 0; k < n; k++) {
    const kMask = reach[k]!;
    const kBit = 1n << BigInt(k);
    for (let i = 0; i < n; i++) {
      if ((reach[i]! & kBit) !== 0n) {
        reach[i] = reach[i]! | kMask;
      }
    }
  }

  return reach;
}

/**
 * Finds the longest sequence formed by chaining numeric fragments
 * based on matching 2-digit overlaps (last 2 digits matching first 2 digits).
 *
 * Each fragment can be used at most once.
 *
 * @param fragments - Array of numeric fragment strings.
 * @returns ChainResult containing the sequence, fragment count, and fragment indices.
 */
export function findLongestSequence(fragments: string[]): ChainResult {
  if (!Array.isArray(fragments) || fragments.length === 0) {
    return {
      sequence: "",
      sequenceLength: 0,
      fragments: 0,
      fragmentIndexes: [],
    };
  }

  validateFragments(fragments);

  const n = fragments.length;
  if (n === 1) {
    const single = fragments[0]!;
    return {
      sequence: single,
      sequenceLength: single.length,
      fragments: 1,
      fragmentIndexes: [0],
    };
  }

  // Precompute 2-digit prefixes and suffixes
  const prefixes: string[] = new Array(n);
  const suffixes: string[] = new Array(n);
  const prefixMap = new Map<string, number[]>();

  for (let i = 0; i < n; i++) {
    const frag = fragments[i]!;
    const prefix = frag.slice(0, 2);
    const suffix = frag.slice(-2);
    prefixes[i] = prefix;
    suffixes[i] = suffix;

    let list = prefixMap.get(prefix);
    if (!list) {
      list = [];
      prefixMap.set(prefix, list);
    }
    list.push(i);
  }

  // Precompute graph adjacency list: for each fragment i, find all valid next fragments j (j != i)
  const adj: number[][] = new Array(n);
  for (let i = 0; i < n; i++) {
    const matching = prefixMap.get(suffixes[i]!) || [];
    adj[i] = matching.filter((j) => j !== i);
  }

  // Fast path: Check if graph is a DAG (Directed Acyclic Graph)
  const topoOrder = getTopologicalOrderIfDAG(n, adj);
  if (topoOrder !== null) {
    const dagPath = findLongestPathInDAG(n, adj, topoOrder);
    const seq = buildSequenceFromPath(fragments, dagPath);
    return {
      sequence: seq,
      sequenceLength: seq.length,
      fragments: dagPath.length,
      fragmentIndexes: dagPath,
    };
  }

  // General case with cycles: Branch-and-bound DFS with transitive reachability pruning
  const reachMasks = computeReachabilityMasks(n, adj);

  // Sort neighbors by ascending out-degree (Warnsdorff heuristic) to find deep paths fast
  for (let i = 0; i < n; i++) {
    adj[i]!.sort((a, b) => (adj[a]?.length ?? 0) - (adj[b]?.length ?? 0));
  }

  let bestPath: number[] = [];
  const currentPath: number[] = [];
  let usedMask = 0n;

  // Maximum search step budget to guarantee quick response on pathological dense cyclic graphs
  let stepCount = 0;
  const maxSteps = 2_000_000;

  function dfs(currentIdx: number, depth: number): void {
    if (++stepCount > maxSteps) {
      return;
    }

    if (depth > bestPath.length) {
      bestPath = currentPath.slice();
      if (bestPath.length === n) {
        return;
      }
    }

    // Reachability upper-bound pruning:
    // Count how many unused nodes are reachable from currentIdx
    const reachableUnused = reachMasks[currentIdx]! & ~usedMask;
    const maxPossibleRemaining = popcountBigInt(reachableUnused);
    if (depth + maxPossibleRemaining <= bestPath.length) {
      return;
    }

    const neighbors = adj[currentIdx]!;
    for (let k = 0; k < neighbors.length; k++) {
      const nextIdx = neighbors[k]!;
      const bit = 1n << BigInt(nextIdx);

      if ((usedMask & bit) === 0n) {
        usedMask |= bit;
        currentPath.push(nextIdx);

        dfs(nextIdx, depth + 1);

        currentPath.pop();
        usedMask &= ~bit;

        if (bestPath.length === n || stepCount > maxSteps) {
          return;
        }
      }
    }
  }

  // Try each start node
  const startCandidates: number[] = Array.from({ length: n }, (_, i) => i);
  startCandidates.sort((a, b) => (adj[b]?.length ?? 0) - (adj[a]?.length ?? 0));

  for (let c = 0; c < startCandidates.length; c++) {
    const startIdx = startCandidates[c]!;

    if (bestPath.length === n || stepCount > maxSteps) {
      break;
    }

    // If total reachable from startIdx cannot beat bestPath.length, skip
    const totalReachable = popcountBigInt(reachMasks[startIdx]!);
    if (totalReachable <= bestPath.length) {
      continue;
    }

    const bit = 1n << BigInt(startIdx);
    usedMask = bit;
    currentPath.push(startIdx);

    dfs(startIdx, 1);

    currentPath.pop();
    usedMask = 0n;
  }

  if (bestPath.length === 0) {
    bestPath = [0];
  }

  const seq = buildSequenceFromPath(fragments, bestPath);
  return {
    sequence: seq,
    sequenceLength: seq.length,
    fragments: bestPath.length,
    fragmentIndexes: bestPath,
  };
}

/**
 * Asynchronously reads a text file and computes the longest sequence chain.
 *
 * @param filePath - The path to the text file.
 * @returns Promise resolving to the ChainResult.
 */
export async function findLongestSequenceFromFile(filePath: string): Promise<ChainResult> {
  const fragments = await readAndParseFile(filePath);
  return findLongestSequence(fragments);
}

/**
 * Synchronously reads a text file and computes the longest sequence chain.
 *
 * @param filePath - The path to the text file.
 * @returns The ChainResult.
 */
export function findLongestSequenceFromFileSync(filePath: string): ChainResult {
  const fragments = readAndParseFileSync(filePath);
  return findLongestSequence(fragments);
}
