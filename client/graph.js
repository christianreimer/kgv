
const EDGE_OPACITY = 0.5;
const EDGE_HIGH_OPACITY = 0.85;
const EDGE_TEXT_COLOR = '#ddd';
const EDGE_HIGHLIGHT_COLOR = '#ddd'
const EDGE_NORMAL_COLOR = '#666';
const NODE_TEXT_COLOR = '#ddd';

const SERVER_URL = 'http://localhost:8080/api';
const CYTOSCAPE_LAYOUT = {
    name: 'fcose',
    animate: false,
    quality: 'proof',
    fit: true,
    nodeDimensionsIncludeLabels: true,
    idealEdgeLength: edge => 75,
    nodeRepulsion: node => 145000,
    numIter: 5000,
};
const NODE_STYLE = {
    "text-valign": "center",
    "text-halign": "center",
    "color": NODE_TEXT_COLOR,
    "font-size": "8px",
    "font-family": "helvetica",
    "label": 'data(label)',
    "width": 'data(weight)',
    "height": 'data(weight)',
    "text-wrap": "wrap",
    "text-max-width": 'data(weight)',
    'background-color': 'data(color)',
    'z-index': 'data(weight)',
};
const EDGE_STYLE = {
    'opacity': EDGE_OPACITY,
    'width': 'data(weight)',
    'line-color': EDGE_NORMAL_COLOR,
    'target-arrow-color': EDGE_NORMAL_COLOR,
    'target-arrow-shape': 'triangle',
    'curve-style': 'bezier',
    'label': 'data(label)',
    'color': NODE_TEXT_COLOR,
    "font-size": "6px",
    "font-family": "helvetica",
    'text-background-color': '#111',
    'text-background-opacity': 0.75,
    'text-background-padding': '1px',
    'text-wrap': 'wrap',
    'text-max-width': '50',
    'arrow-scale': 0.5,
};

const fetchGraph = async () => {
    return fetch(`${SERVER_URL}/graph`)
        .then(resp => resp.json())
        .then(data => {
            return [data['nodes'], data['edges']];
        });
}

const [nodes, edges] = await fetchGraph();

const State = class {
    constructor() {
        this.highlightedNodes = [];
        this.highlightedEdges = [];
    }
    addNodeToHighlightSet(id) {
        if (!this.highlightedNodes.includes(id)) {
            this.highlightedNodes.push(id);
        }
    }
    removeNodeFromHighlightSet(id) {
        const idx = this.highlightedNodes.indexOf(id);
        if (idx != -1) {
            this.highlightedNodes.splice(idx, 1);
        }
    }
    nodeIsHighlighted(id) {
        return this.highlightedNodes.includes(id);
    }
    addEdgeToHighlightSet(id) {
        if (!this.highlightedEdges.includes(id)) {
            this.highlightedEdges.push(id);
        }
    }
    removeEdgeFromHighlightSet(id) {
        const idx = this.highlightedEdges.indexOf(id);
        if (idx != -1) {
            this.highlightedEdges.splice(idx, 1);
        }
    }
    edgeIsHighlighted(id) {
        return this.highlightedEdges.includes(id);
    }
}

let state = new State();

let cy = cytoscape({
    container: document.getElementById('cy'),
    elements: {
        nodes: nodes,
        edges: edges,
    },
    style: [{
        selector: 'node',
        style: NODE_STYLE,
    },
    {
        selector: 'edge',
        style: EDGE_STYLE,
    }
    ]
});

cy.layout(CYTOSCAPE_LAYOUT).run();

cy.ready(() => {
    cy.elements().forEach(function (ele) {
        let ref = ele.popperRef();
        ele.tippy = tippy(ref, {
            onShow: () => {
                return toggleTooltip(ref, ele);
            },
            trigger: 'manual',
            interactive: true,
            arrow: true,
            hideOnClick: false,
        });
    });
});

cy.elements().unbind('click')
cy.elements().bind('click', (event) => {
    if (event.target.isNode()) {
        nodeHighlightToggle(event.target.id());
    } else if (event.target.isEdge()) {
        edgeHighlightToggle(event.target.id());
    }
});

// Show tooltip on right click
cy.on('cxttap', "node", (event) => {
    event.target.tippy.show();
});
cy.on('cxttap', "edge", (event) => {
    event.target.tippy.show();
});

const nodeHighlightToggle = (id) => {
    if (state.nodeIsHighlighted(id)) {
        resetNode(id);
    } else {
        highlightNode(id);
    }
}

const edgeHighlightToggle = (id) => {
    if (state.edgeIsHighlighted(id)) {
        resetEdge(id);
    } else {
        highlightEdge(id);

    }
}

// Highlight a node and its connected edges
const highlightNode = (id) => {
    // Highlight the node that was clicked
    fetch(`${SERVER_URL}/node/${id}`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        let elem = cy.getElementById(id);
        elem.style('background-color', data["data"]["highlightColor"]);
        elem.style('width', data["data"]["weight"] * 1.15);
        elem.style('height', data["data"]["weight"] * 1.15);
        state.addNodeToHighlightSet(id);
    }).catch((error) => {
        console.error(error)
    });

    // Highlight all the edges that connect to the node
    fetch(`${SERVER_URL}/node/${id}/edges`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        data.forEach((edge) => {
            let elem = cy.getElementById(edge['data']['id'])
            elem.style('line-color', 'white');
            elem.style('target-arrow-color', 'white');
            elem.style('opacity', EDGE_HIGH_OPACITY)
            state.addEdgeToHighlightSet(edge['data']['id']);
        });
    }).catch((error) => {
        console.error(error)
    });
}

const resetNode = (id) => {
    // Reset the node that was clicked
    fetch(`${SERVER_URL}/node/${id}`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        let elem = cy.getElementById(id);
        elem.style('background-color', 'red');
        elem.style('background-color', data["data"]["color"]);
        elem.style('width', data["data"]["weight"]);
        elem.style('height', data["data"]["weight"]);
        state.removeNodeFromHighlightSet(id);
    }).catch((error) => {
        console.error(error)
    });

    // Reset the edges that connect to the node
    fetch(`${SERVER_URL}/node/${id}/edges`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        data.forEach((edge) => {
            let elem = cy.getElementById(edge['data']['id'])
            elem.style('line-color', '#666');
            elem.style('target-arrow-color', '#666');
            elem.style('opacity', EDGE_OPACITY);
            state.removeEdgeFromHighlightSet(edge['data']['id']);
        });
    }).catch((error) => {
        console.error(error)
    });
}

const highlightEdge = (id) => {
    // Highlight the edge that was clicked
    fetch(`${SERVER_URL}/edge/${id}`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        let edge = cy.getElementById(id);
        edge.style('line-color', EDGE_HIGHLIGHT_COLOR);
        edge.style('target-arrow-color', EDGE_HIGHLIGHT_COLOR);
        edge.style('opacity', EDGE_HIGH_OPACITY);
        state.addEdgeToHighlightSet(id);
    }).catch((error) => {
        console.error(error)
    });

    // Highlight the nodes at each end of the edge
    fetch(`${SERVER_URL}/edge/${id}/nodes`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        data.forEach((node) => {
            let elem = cy.getElementById(node["data"]["id"]);
            elem.style('background-color', node["data"]["highlightColor"]);
            elem.style('width', elem.data('weight') * 1.15);
            elem.style('height', elem.data('weight') * 1.15);
        });
    }).catch((error) => {
        console.error(error)
    });
}

const resetEdge = (id) => {
    // Reset the edge that was clicked
    fetch(`${SERVER_URL}/edge/${id}`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        let edge = cy.getElementById(id);
        edge.style('line-color', '#666');
        edge.style('target-arrow-color', '#666');
        edge.style('opacity', EDGE_HIGH_OPACITY);
        state.removeEdgeFromHighlightSet(id);
    }).catch((error) => {
        console.error(error)
    });

    // Reset the nodes at each end of the edge
    fetch(`${SERVER_URL}/edge/${id}/nodes`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        data.forEach((node) => {
            let id = node["data"]["id"];
            if (!state.nodeIsHighlighted(id)) {
                // Only reset highlight if the node was not explicitly highlighted
                let elem = cy.getElementById(id);
                elem.style('background-color', node["data"]["color"]);
                elem.style('width', node["data"]["weight"]);
                elem.style('height', node["data"]["weight"]);
            }
        });
    }).catch((error) => {
        console.error(error)
    });
}


const toggleTooltip = (ref, ele) => {
    // Clicking the node is a toggle, so if already shown, hide it
    if (ref._tippy.shown) {
        ref._tippy.hide();
        ref._tippy.shown = false;
        return false;
    }

    let id = ele.id();
    fetch(`${SERVER_URL}/tooltip/${id}`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        let div = document.createElement('div');
        div.classList.add('ttip');
        div.addEventListener('click', () => {
            ref._tippy.hide();
            ref._tippy.shown = false;
        });
        div.innerHTML = data['description'];
        ref._tippy.setContent(div);
        ref._tippy.shown = true;
    }).catch((error) => {
        console.error(`Failed to get tooltip for ${id}, error: ${error}`);
    });

    return true;
}
