package main

import (
	"encoding/json"
	"fmt"
	"kgv/kgv"
	"net/http"
)

type Api struct {
	Data     kgv.GraphData
	edges    map[string]kgv.Edge
	nodes    map[string]kgv.Node
	tooltips map[string]kgv.Tooltip
}

func main() {
	api := NewApi()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/graph", api.GetGraph)
	mux.HandleFunc("GET /api/tooltip/{id}", api.GetTooltip)
	mux.HandleFunc("GET /api/node/{id}", api.GetNode)
	mux.HandleFunc("GET /api/node/{id}/edges", api.GetEdges)
	mux.HandleFunc("GET /api/edge/{id}", api.GetEdge)
	mux.HandleFunc("GET /api/edge/{id}/nodes", api.GetEdgeEndpoints)

	server := &http.Server{
		Addr:    "localhost:8080",
		Handler: mux,
	}
	fmt.Printf("Listening on %s\n", server.Addr)
	server.ListenAndServe()
}

func NewApi() Api {
	data, nodes, edges, tooltips, err := kgv.Load("data/data5.json")
	if err != nil {
		fmt.Println(err)
		return Api{}
	}

	api := Api{
		Data:     data,
		edges:    edges,
		nodes:    nodes,
		tooltips: tooltips,
	}
	return api
}

func (a *Api) GetGraph(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	j, err := json.Marshal(a.Data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

func (a *Api) GetTooltip(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	id := r.PathValue("id")
	tooltip, ok := a.tooltips[id]
	if !ok {
		tooltip = kgv.Tooltip{
			Iri:         "default",
			Label:       "Default",
			Type:        "Default",
			Description: "Such emptiness 😞",
		}
	}
	j, err := json.Marshal(tooltip)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

// Return array of all edges that connect to node with given id
func (a *Api) GetEdges(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	id := r.PathValue("id")
	edges := make([]kgv.Edge, 0)
	for _, edge := range a.Data.AllEdges {
		if edge.Data.Source == id || edge.Data.Target == id {
			edges = append(edges, edge)
		}
	}
	j, err := json.Marshal(edges)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

// Return node with given id
func (a *Api) GetNode(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	id := r.PathValue("id")
	node, ok := a.nodes[id]
	if !ok {
		http.Error(w, "Node not found", http.StatusNotFound)
		return
	}
	j, err := json.Marshal(node)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

// Return edge with given id
func (a *Api) GetEdge(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	id := r.PathValue("id")
	edge, ok := a.edges[id]
	if !ok {
		http.Error(w, "Edge not found", http.StatusNotFound)
		return
	}
	j, err := json.Marshal(edge)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

// Return the source and target nodes for an edge with given id
func (a *Api) GetEdgeEndpoints(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	id := r.PathValue("id")
	edge, ok := a.edges[id]
	if !ok {
		http.Error(w, "Edge not found", http.StatusNotFound)
		return
	}
	source, ok := a.nodes[edge.Data.Source]
	if !ok {
		http.Error(w, "Source node not found", http.StatusNotFound)
		return
	}
	target, ok := a.nodes[edge.Data.Target]
	if !ok {
		http.Error(w, "Target node not found", http.StatusNotFound)
		return
	}

	j, err := json.Marshal([]kgv.Node{source, target})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}
