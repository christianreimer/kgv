package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type Api struct {
	Data     GraphData
	tooltips map[string]Tooltip
}

type GraphData struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

type NodeData struct {
	Id     string `json:"id"`
	Label  string `json:"label"`
	Weight int    `json:"weight"`
	Color  string `json:"color"`
}

type Node struct {
	Data NodeData `json:"data"`
}

type EdgeData struct {
	Id     string `json:"id"`
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

func main() {
	api := NewApi()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/graph", api.GetGraph)
	mux.HandleFunc("GET /api/tooltip/{id}", api.GetTooltip)

	server := &http.Server{
		Addr:    "localhost:8080",
		Handler: mux,
	}
	fmt.Printf("Listening on %s\n", server.Addr)
	server.ListenAndServe()
}

func NewApi() *Api {
	data := GraphData{
		Nodes: []Node{
			{Data: NodeData{Id: "n1", Label: "Node 1", Weight: 50, Color: "#ff0000"}},
			{Data: NodeData{Id: "n2", Label: "Node 2", Weight: 60, Color: "#00ff00"}},
			{Data: NodeData{Id: "n3", Label: "Node 3", Weight: 70, Color: "#0000ff"}},
			{Data: NodeData{Id: "n4", Label: "Node 4", Weight: 80, Color: "#ffff00"}},
			{Data: NodeData{Id: "n5", Label: "Node 5", Weight: 90, Color: "#00ffff"}},
		},
		Edges: []Edge{
			{Data: EdgeData{Id: "e1", Source: "n1", Target: "n2", Label: "Edge 1", Weight: 5}},
			{Data: EdgeData{Id: "e2", Source: "n2", Target: "n3", Label: "Edge 2", Weight: 5}},
			{Data: EdgeData{Id: "e3", Source: "n3", Target: "n1", Label: "Edge 3", Weight: 5}},
			{Data: EdgeData{Id: "e4", Source: "n4", Target: "n1", Label: "Edge 4", Weight: 5}},
			{Data: EdgeData{Id: "e5", Source: "n5", Target: "n1", Label: "Edge 5", Weight: 5}},
		},
	}

	tooltips := map[string]Tooltip{
		"n1": {Iri: "n1", Label: "Node 1", Type: "Node", Description: "This is node 1"},
		"n2": {Iri: "n2", Label: "Node 2", Type: "Node", Description: "This is node 2"},
		"n3": {Iri: "n3", Label: "Node 3", Type: "Node", Description: "This is node 3"},
		"n4": {Iri: "n4", Label: "Node 4", Type: "Node", Description: "This is node 4"},
		"n5": {Iri: "n5", Label: "Node 5", Type: "Node", Description: "This is node 5"},
	}

	api := &Api{
		Data:     data,
		tooltips: tooltips,
	}
	return api
}

func (a *Api) GetGraph(w http.ResponseWriter, r *http.Request) {
	j, err := json.Marshal(a.Data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

func (a *Api) GetTooltip(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tooltip, ok := a.tooltips[id]
	if !ok {
		tooltip = Tooltip{
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
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}
