
const EDGE_NORMAL_OPACITY = 0.5;
const EDGE_HIGHLIGHT_OPACITY = 0.85;
const EDGE_TEXT_COLOR = '#ddd';
const EDGE_HIGHLIGHT_TEXT_COLOR = '#fff';
const EDGE_HIGHLIGHT_COLOR = '#ddd'
const EDGE_NORMAL_COLOR = '#666';
const EDGE_MAX_WIDTH = 5;
const NODE_TEXT_COLOR = '#ccc';
const SERVER_URL = 'http://localhost:8080/api';

const CYTOSCAPE_LAYOUT = {
    name: 'fcose',
    animate: false,
    quality: 'proof',
    fit: true,
    nodeDimensionsIncludeLabels: true,
    idealEdgeLength: edge => 100,
    nodeRepulsion: node => 50000,
    numIter: 5000,
};

const NODE_STYLE = {
    'shape': 'round-rectangle',
    // 'corner-radius': '2em',
    "text-valign": "center",
    "text-halign": "center",
    "color": NODE_TEXT_COLOR,
    "font-size": "8px",
    "min-zoomed-font-size": "8px",
    "font-family": "helvetica",
    "label": 'data(label)',
    "width": 'data(weight)',
    "height": 'data(weight)',
    "text-wrap": "wrap",
    "text-max-width": 'data(weight)',
    'background-color': 'data(color)',
    'border-color': 'white',
    'border-width': '0px',
};

const EDGE_STYLE = {
    'opacity': EDGE_NORMAL_OPACITY,
    'width': 'data(weight)',
    'line-color': EDGE_NORMAL_COLOR,
    'target-arrow-color': EDGE_NORMAL_COLOR,
    'target-arrow-shape': 'triangle',
    'curve-style': 'bezier',
    'label': 'data(label)',
    'color': EDGE_TEXT_COLOR,
    "font-size": "8px",
    "min-zoomed-font-size": "10px",
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
    let id = event.target.id();
    if (event.target.isNode()) {
        if (state.nodeIsHighlighted(id)) {
            unselectNode(id);
        } else {
            selectNode(id);
        }
    } else if (event.target.isEdge()) {
        if (state.edgeIsHighlighted(id)) {
            unselectEdge(id);
        } else {
            selectEdge(id);
        }
    }
});

// Show tooltip on right click
cy.on('cxttap', "node", (event) => {
    event.target.tippy.show();
});
cy.on('cxttap', "edge", (event) => {
    event.target.tippy.show();
});

const selectNode = (id) => {
    fetch(`${SERVER_URL}/node/${id}`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        highlightNode(data)
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
            highlightEdge(edge);
            state.addEdgeToHighlightSet(edge['data']['id']);
        });
    }).catch((error) => {
        console.error(error)
    });
}

const unselectNode = (id) => {
    fetch(`${SERVER_URL}/node/${id}`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        unhighlightNode(data);
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
            unhighlightEdge(edge);
            state.removeEdgeFromHighlightSet(edge['data']['id']);
        });
    }).catch((error) => {
        console.error(error)
    });
}

const highlightNode = (node) => {
    let elem = cy.getElementById(node['data']['id']);
    elem.style('background-color', node["data"]["highlightColor"]);
    elem.style('border-width', '2px');
}

const unhighlightNode = (node) => {
    let elem = cy.getElementById(node['data']['id']);
    elem.style('background-color', node["data"]["color"]);
    elem.style('border-width', '0px');
}

const highlightEdge = (edge) => {
    let elem = cy.getElementById(edge['data']['id'])
    elem.style('line-color', EDGE_HIGHLIGHT_COLOR);
    elem.style('target-arrow-color', EDGE_HIGHLIGHT_COLOR);
    elem.style('opacity', EDGE_HIGHLIGHT_OPACITY)
    elem.style('color', EDGE_HIGHLIGHT_TEXT_COLOR);

    let width = edge["data"]["weight"] * 1.5;
    width = Math.min(width, EDGE_MAX_WIDTH);
    elem.style('width', width);

}

const unhighlightEdge = (edge) => {
    let elem = cy.getElementById(edge['data']['id']);
    elem.style('line-color', EDGE_NORMAL_COLOR);
    elem.style('target-arrow-color', EDGE_NORMAL_COLOR);
    elem.style('opacity', EDGE_NORMAL_OPACITY);
    elem.style('color', EDGE_TEXT_COLOR);
    elem.style('width', edge["data"]["weight"]);
}

const unselectEdge = (id) => {
    fetch(`${SERVER_URL}/edge/${id}`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        unhighlightEdge(data);
        state.removeEdgeFromHighlightSet(id);
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
            unhighlightNode(node);
        });
    }).catch((error) => {
        console.error(error)
    });
}

const selectEdge = (id) => {
    fetch(`${SERVER_URL}/edge/${id}`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        highlightEdge(data);
        state.addEdgeToHighlightSet(id);
    }).catch((error) => {
        console.error(error)
    });

    // Select the nodes at each end of the edge
    fetch(`${SERVER_URL}/edge/${id}/nodes`).then((resp) => {
        if (resp.ok) {
            return resp.json();
        }
        throw new Error('Failed to fetch');
    }).then((data) => {
        data.forEach((node) => {
            highlightNode(node);
            state.addNodeToHighlightSet(node["data"]["id"]);
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

// Calculate centroid of the selected nodes (ignore node weights)
const calculateCentroid = () => {
    let x = 0;
    let y = 0;

    if (state.highlightedNodes.length > 0) {
        state.highlightedNodes.forEach((id) => {
            let node = cy.getElementById(id);
            x += node.position().x;
            y += node.position().y;
        });

        x /= state.highlightedNodes.length;
        y /= state.highlightedNodes.length;
    } else {
        cy.nodes().forEach((node) => {
            x += node.position().x;
            y += node.position().y;
        });

        x /= cy.nodes().length;
        y /= cy.nodes().length;
    }
    return { x: x, y: y };
}

const unselectAll = () => {
    nodes.forEach((node) => {
        unhighlightNode(node);
    });
    edges.forEach((edge) => {
        unhighlightEdge(edge);
    });
    state.highlightedNodes = [];
    state.highlightedEdges = [];
}


const reset = () => {
    console.log(cy.$(':selected'));
    cy.fit();
}

const zoomIn = () => {
    let center = calculateCentroid();
    cy.zoom({
        level: cy.zoom() * 1.2,
        position: center,
    });
}

const zoomOut = () => {
    let center = calculateCentroid();
    cy.zoom({
        level: cy.zoom() * 0.8,
        position: center,
    });
}

const recenter = () => {
    let selectedElements = cy.elements(':selected');
    cy.pan(selectedElements);
}

export {
    highlightNode,
    unhighlightNode,
    highlightEdge,
    unhighlightEdge,
    selectNode,
    selectEdge,
    reset,
    zoomIn,
    zoomOut,
    recenter,
    state,
}