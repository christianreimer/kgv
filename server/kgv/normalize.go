package kgv

import (
	"fmt"
	"math"

	"github.com/teacat/noire"
)

const (
	MIN_EDGE_WEIGHT = 1
	MAX_EDGE_WEIGHT = 10
	MIN_NODE_WEIGHT = 10
	MAX_NODE_WEIGHT = 100
)

func adjustNodeWeights(nodes []Node) []Node {
	max := 0
	for _, node := range nodes {
		if node.Data.Weight > max {
			max = node.Data.Weight
		}
	}

	for i, node := range nodes {
		weight := math.Log2(float64(node.Data.Weight)) * 5
		if weight < MIN_NODE_WEIGHT {
			weight = MIN_NODE_WEIGHT
		}
		if weight > MAX_NODE_WEIGHT {
			weight = MAX_NODE_WEIGHT
		}
		nodes[i].Data.Weight = int(weight)
	}
	return nodes
}

func adjustEdgeWeights(edges []Edge) []Edge {
	max := 0
	for _, edge := range edges {
		if edge.Data.Weight > max {
			max = edge.Data.Weight
		}
	}

	// Normalize edge weights
	for i, edge := range edges {
		weight := (edge.Data.Weight / max) * 3
		if weight < MIN_EDGE_WEIGHT {
			weight = MIN_EDGE_WEIGHT
		}
		if weight > MAX_EDGE_WEIGHT {
			weight = MAX_EDGE_WEIGHT
		}
		edges[i].Data.Weight = weight
	}
	return edges
}

// Calculate color by increasing hue for each node
func calculateHighlightColors(nodes []Node) []Node {
	for i, node := range nodes {
		c := noire.NewHex(node.Data.Color[1:])
		nodes[i].Data.HighlightColor = fmt.Sprintf("#%s", c.Brighten(0.1).Hex())
	}
	return nodes
}
