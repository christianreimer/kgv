package kgv

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"unicode"
)

type GraphData struct {
	AllNodes []Node `json:"nodes"`
	AllEdges []Edge `json:"edges"`
}

type NodeData struct {
	Id             string `json:"id"`
	Iri            string `json:"iri"`
	Label          string `json:"label"`
	Weight         int    `json:"weight"`
	Color          string `json:"color"`
	HighlightColor string `json:"highlightColor"`
}

type Node struct {
	Data NodeData `json:"data"`
}

type EdgeData struct {
	Id     string `json:"id"`
	Iri    string `json:"iri"`
	Source string `json:"source"`
	Target string `json:"target"`
	Label  string `json:"label"`
	Weight int    `json:"weight"`
}

type Edge struct {
	Data EdgeData `json:"data"`
}

type Tooltip struct {
	Iri         string `json:"iri"`
	Label       string `json:"label"`
	Type        string `json:"type"`
	Description string `json:"description"`
}

func Load(fname string) (GraphData, map[string]Node, map[string]Edge, map[string]Tooltip, error) {
	file, err := os.Open(fname)
	if err != nil {
		return GraphData{}, nil, nil, nil, err
	}
	defer file.Close()

	data := GraphData{}
	err = json.NewDecoder(file).Decode(&data)
	if err != nil {
		return GraphData{}, nil, nil, nil, err
	}

	tooltips := map[string]Tooltip{
		"n1": {Iri: "n1", Label: "Node 1", Type: "Node", Description: "This is node 1"},
		"n2": {Iri: "n2", Label: "Node 2", Type: "Node", Description: "This is node 2"},
		"n3": {Iri: "n3", Label: "Node 3", Type: "Node", Description: "This is node 3"},
		"n4": {Iri: "n4", Label: "Node 4", Type: "Node", Description: "This is node 4"},
		"n5": {Iri: "n5", Label: "Node 5", Type: "Node", Description: "This is node 5"},
	}

	// Remove duplicates (ducking namespaces!)
	data.AllNodes = squashNodes(data.AllNodes)
	data.AllEdges = squashEdges(data.AllEdges)

	data.AllNodes = adjustNodeWeights(data.AllNodes)
	remainingNodes, removedNodes := removeDummyNodes(data.AllNodes)
	data.AllNodes = remainingNodes
	data.AllEdges = adjustEdgeWeights(data.AllEdges)
	data.AllEdges = pruneEdges(data.AllEdges, removedNodes)
	data.AllNodes, data.AllEdges = adjustLabels(data.AllNodes, data.AllEdges)
	data.AllNodes, data.AllEdges = removeDisconnectedEdges(data.AllNodes, data.AllEdges)
	data.AllNodes = addColors(data.AllNodes)
	data.AllNodes = calculateHighlightColors(data.AllNodes)

	nodes := make(map[string]Node)
	for _, node := range data.AllNodes {
		nodes[node.Data.Id] = node
	}

	edges := make(map[string]Edge)
	for _, edge := range data.AllEdges {
		edges[edge.Data.Id] = edge
	}

	return data, nodes, edges, tooltips, nil
}

func addColors(nodes []Node) []Node {
	colors := []string{"#091849", "#1d355d", "#0f162e", "#421034", "#3b012a"}
	for i := range nodes {
		nodes[i].Data.Color = colors[i%len(colors)]
	}
	return nodes
}

// Remove edges where either source or target node is null
func pruneEdges(edges []Edge, removed map[string]bool) []Edge {
	var cleaned []Edge
	for _, edge := range edges {
		if edge.Data.Source != "" && edge.Data.Target != "" {
			if !removed[edge.Data.Source] && !removed[edge.Data.Target] {
				cleaned = append(cleaned, edge)
			}
		}
	}
	return cleaned
}

func removeDummyNodes(nodes []Node) ([]Node, map[string]bool) {
	var cleaned []Node
	removed := make(map[string]bool)

	for _, node := range nodes {
		if node.Data.Label == "IsupEntity" {
			removed[node.Data.Id] = true
		} else {
			cleaned = append(cleaned, node)
		}
	}
	return cleaned, removed
}

// Convert all labels by inserting spaces between camel case words
func adjustLabels(nodes []Node, edges []Edge) ([]Node, []Edge) {
	for i, node := range nodes {
		nodes[i].Data.Label = splitCamelCase(node.Data.Label)
	}
	for i, edge := range edges {
		edges[i].Data.Label = splitCamelCase(edge.Data.Label)
	}
	return nodes, edges
}

// Convert from `word1Word2“ to `word1 word2“
func splitCamelCase(s string) string {
	var parts []string
	start := 0
	for end, r := range s {
		if end != 0 && unicode.IsUpper(r) {
			parts = append(parts, s[start:end])
			start = end
		}
	}
	if start != len(s) {
		parts = append(parts, s[start:])
	}
	return strings.Join(parts, " ")
}

func removeDisconnectedEdges(nodes []Node, edges []Edge) ([]Node, []Edge) {
	connected := make(map[string]bool)
	for _, edge := range edges {
		connected[edge.Data.Source] = true
		connected[edge.Data.Target] = true
	}

	var cleanedNodes []Node
	for _, node := range nodes {
		if connected[node.Data.Id] {
			cleanedNodes = append(cleanedNodes, node)
		}
	}

	var cleanedEdges []Edge
	for _, edge := range edges {
		if connected[edge.Data.Source] && connected[edge.Data.Target] {
			cleanedEdges = append(cleanedEdges, edge)
		}
	}

	return cleanedNodes, cleanedEdges
}

func squashNodes(nodes []Node) []Node {
	unique := make(map[string]Node)
	for _, node := range nodes {
		iri := qname(node.Data.Iri)
		n, ok := unique[iri]
		if ok {
			node.Data.Weight += n.Data.Weight
		}
		unique[iri] = node
	}

	uniqueNodes := make([]Node, 0, len(unique))
	for _, node := range unique {
		uniqueNodes = append(uniqueNodes, node)
	}
	return uniqueNodes
}

func squashEdges(edges []Edge) []Edge {
	unique := make(map[string]Edge)
	for _, edge := range edges {
		iri := qname(edge.Data.Iri)
		key := fmt.Sprintf("%s|%s|%s", edge.Data.Source, iri, edge.Data.Target)
		e, ok := unique[key]
		if ok {
			edge.Data.Weight += e.Data.Weight
		}
		unique[key] = edge
	}

	uniqueEdges := make([]Edge, 0, len(unique))
	for _, edge := range unique {
		uniqueEdges = append(uniqueEdges, edge)
	}
	return uniqueEdges
}

// split the string and return only what is after the last /
func qname(s string) string {
	parts := strings.Split(s, "/")
	return parts[len(parts)-1]
}
