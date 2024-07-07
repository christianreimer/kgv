package kgv

type Config struct {
	MinEdgeWeight            int    `json:"minEdgeWeight"`
	MaxEdgeWeight            int    `json:"maxEdgeWeight"`
	MinNodeWeight            int    `json:"minNodeWeight"`
	MaxNodeWeight            int    `json:"maxNodeWeight"`
	DefaultEdgeColor         string `json:"defaultEdgeColor"`
	HighlightedEdgeColor     string `json:"highlightedEdgeColor"`
	DefaultEdgeTextColor     string `json:"defaultEdgeTextColor"`
	HighlightedEdgeTextColor string `json:"highlightedEdgeTextColor"`
}

func DefaultConfig() Config {
	return Config{
		MinEdgeWeight:            1,
		MaxEdgeWeight:            10,
		MinNodeWeight:            10,
		MaxNodeWeight:            100,
		DefaultEdgeColor:         "#ccc",
		HighlightedEdgeColor:     "#eee",
		DefaultEdgeTextColor:     "#333",
		HighlightedEdgeTextColor: "#ccc",
	}
}
