# Longest Fragment Chaining

A TypeScript application to find the longest possible sequence by chaining numeric fragments based on 2-digit overlaps.

## Overview

Each fragment can be used only once. Two fragments can be chained together if the last two digits (suffix) of the 
leading fragment match the first two digits (prefix) of the following fragment.

## How It Is Implemented

The project is structured modularly in `src/` and implements the solution through three primary phases:

### 1. Parsing & Validation (`src/parser.ts`, `src/validator.ts`)
- **Tokenization:** Reads input text files (supporting both async and synchronous execution) and splits content 
- by whitespace into candidate tokens.
- **Validation:** Ensures every fragment consists strictly of digits, has a minimum length of 2 characters,
- and reports clear errors on invalid inputs.

### 2. Graph Modeling (`src/chain.ts`)
- **Prefix/Suffix Mapping:** Precomputes 2-digit prefixes and suffixes for all fragments, using a hash map to index 
- fragments by prefix.
- **Directed Graph Construction:** Builds an adjacency list where a directed edge exists from fragment $u$ to fragment
- $v$ ($u \neq v$) if the 2-digit suffix of $u$ equals the 2-digit prefix of $v$.

### 3. Longest Path Optimization (`src/chain.ts`)
Finding the longest simple path in a general directed graph is NP-hard. To deliver optimal performance and maximize
computational efficiency across different graph topologies, the engine uses a dual-strategy approach:

- **DAG Fast Path ($O(V + E)$):**
  - First tests if the graph is a Directed Acyclic Graph (DAG) using topological sorting (Kahn's algorithm).
  - If acyclic, it computes the globally optimal longest path in linear time via Dynamic Programming 
    in reverse topological order.
- **Branch-and-Bound DFS with Reachability Pruning:**
  - For graphs containing cycles, the engine runs a branch-and-bound Depth-First Search (DFS) with `BigInt` bitmasks 
    for $O(1)$ visited-state operations.
  - **Transitive Reachability Pruning:** Precomputes reachability bitmasks (transitive closure via Warshall's algorithm)
    to establish a strict upper bound on reachable unused vertices from any current node, pruning subtrees 
    that cannot exceed the current best path.
  - **Search Heuristic:** Orders neighbor transitions by degree to uncover deep chains early in the search tree.

### 4. Sequence Reconstruction & Output (`src/chain.ts`, `src/index.ts`)
- **Sequence Assembly:** Concatenates fragments along the chosen path, appending full text for the first fragment
  and slicing off the overlapping 2-digit prefix for subsequent fragments.
- **CLI Interface:** Provides a CLI runner in `src/index.ts` reporting the chained sequence, sequence length, 
  fragment count, fragment indices, and execution time.

## Usage

###  Install dependencies
```bash
npm install
```

### Run via CLI
```bash
# Run with default input.txt or put your data
npm run build
npm run start


### Run Tests
```bash
npm test
```