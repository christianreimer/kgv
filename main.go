package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"kgv/kgv"
	"net/http"
	"os"
	"strings"
)

//go:embed static/index.html
var indexHtml []byte

//go:embed static
var static embed.FS

//go:embed data/data5.json
var dataFile []byte

type Api struct {
	Data     kgv.GraphData
	edges    map[string]kgv.Edge
	nodes    map[string]kgv.Node
	tooltips map[string]kgv.Tooltip
}

func main() {
	api := NewApi()
	mux := http.NewServeMux()

	staticFS, err := fs.Sub(static, "static")
	if err != nil {
		panic(err)
	}
	mux.Handle("GET /", http.FileServer(http.FS(staticFS)))

	mux.HandleFunc("GET /{$}", index)
	mux.HandleFunc("GET /api/graph", api.GetGraph)
	mux.HandleFunc("GET /api/conf", api.GetConfig)
	mux.HandleFunc("GET /api/tooltip/{id}", api.GetTooltip)
	mux.HandleFunc("GET /api/node/{id}", api.GetNode)
	mux.HandleFunc("GET /api/nodes/{list}", api.GetNodeList)
	mux.HandleFunc("GET /api/node/{id}/edges", api.GetEdges)
	mux.HandleFunc("GET /api/edge/{id}", api.GetEdge)
	mux.HandleFunc("GET /api/edges/{list}", api.GetEdgeList)
	mux.HandleFunc("GET /api/edge/{id}/nodes", api.GetEdgeEndpoints)
	mux.HandleFunc("GET /api/autocomplete", api.GetAutocomplete)

	host, ok := os.LookupEnv("HOST")
	if !ok {
		host = "localhost"
	}
	port, ok := os.LookupEnv("PORT")
	if !ok {
		port = "8080"
	}
	server := &http.Server{
		Addr:    fmt.Sprintf("%s:%s", host, port),
		Handler: mux,
	}
	fmt.Printf("Listening on %s\n", server.Addr)
	server.ListenAndServe()
}

func NewApi() Api {
	reader := bytes.NewReader(dataFile)
	data, nodes, edges, tooltips, err := kgv.Load(reader)
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

func index(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	w.Write(indexHtml)
}

func (a *Api) GetConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	config := kgv.DefaultConfig()
	j, err := json.Marshal(config)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write(j)
}

func (a *Api) GetGraph(w http.ResponseWriter, r *http.Request) {
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

// Return list of nodes with given ids
func (a *Api) GetNodeList(w http.ResponseWriter, r *http.Request) {
	list := r.PathValue("list")
	ids := strings.Split(list, ",")
	nodes := make([]kgv.Node, 0)

	for _, id := range ids {
		node, ok := a.nodes[id]
		if !ok {
			continue
		}
		nodes = append(nodes, node)
	}

	j, err := json.Marshal(nodes)
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

// Return edge with given id
func (a *Api) GetEdgeList(w http.ResponseWriter, r *http.Request) {
	list := r.PathValue("list")
	ids := strings.Split(list, ",")
	edges := make([]kgv.Edge, 0)

	for _, id := range ids {
		edge, ok := a.edges[id]
		if !ok {
			continue
		}
		edges = append(edges, edge)
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

// Return the source and target nodes for an edge with given id
func (a *Api) GetEdgeEndpoints(w http.ResponseWriter, r *http.Request) {
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

// Return array of node and edge ids along with thei labels
func (a *Api) GetAutocomplete(w http.ResponseWriter, r *http.Request) {
	type autocompleteItem struct {
		Id    string `json:"id"`
		Label string `json:"label"`
		Type  string `json:"type"`
	}

	autocomplete := make([]autocompleteItem, 0)
	for id, node := range a.nodes {
		aci := autocompleteItem{
			Id:    id,
			Label: node.Data.Label,
			Type:  "node",
		}
		autocomplete = append(autocomplete, aci)
	}

	for id, edge := range a.edges {
		aci := autocompleteItem{
			Id:    id,
			Label: edge.Data.Label,
			Type:  "edge",
		}
		autocomplete = append(autocomplete, aci)
	}

	j, err := json.Marshal(autocomplete)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(j)
}
