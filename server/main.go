package main

import (
	"encoding/json"
	"fmt"
	"kgv/kgv"
	"net/http"
)

type Api struct {
	Data     kgv.GraphData
	tooltips map[string]kgv.Tooltip
}

func main() {
	api := NewApi()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/graph", api.GetGraph)
	mux.HandleFunc("GET /api/tooltip/{id}", api.GetTooltip)
	mux.HandleFunc("GET /api/edges/{id}", api.GetEdges)
	mux.HandleFunc("GET /api/node/{id}", api.GetNode)

	server := &http.Server{
		Addr:    "localhost:8080",
		Handler: mux,
	}
	fmt.Printf("Listening on %s\n", server.Addr)
	server.ListenAndServe()
}

func NewApi() Api {
	data, tooltips, err := kgv.Load("data/data5.json")
	if err != nil {
		fmt.Println(err)
		return Api{}
	}

	api := Api{
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
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

// Return array of all edges that connect to node with given id
func (a *Api) GetEdges(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	edges := make([]string, 0)
	for _, edge := range a.Data.AllEdges {
		if edge.Data.Source == id || edge.Data.Target == id {
			edges = append(edges, edge.Data.Id)
		}
	}
	j, err := json.Marshal(edges)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

// Return node with given id
func (a *Api) GetNode(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	node, ok := a.Data.Nodes[id]
	if !ok {
		http.Error(w, "Node not found", http.StatusNotFound)
		return
	}
	j, err := json.Marshal(node)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

// Return edge with given id
func (a *Api) GetEdge(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	edge, ok := a.Data.Edges[id]
	if !ok {
		http.Error(w, "Edge not found", http.StatusNotFound)
		return
	}
	j, err := json.Marshal(edge)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}
