const EDGE_OPACITY = 0.5;
const EDGE_HIGH_OPACITY = 0.85;
const SERVER_URL = 'http://localhost:8080/api';

const fetchGraph = async () => {
    return fetch(`${SERVER_URL}/graph`)
        .then(resp => resp.json())
        .then(data => {
            return [data['nodes'], data['edges']];
        });
}

const [nodes, edges] = await fetchGraph();

let cy = cytoscape({
    container: document.getElementById('cy'),
    elements: {
        nodes: nodes,
        edges: edges,
    },
    style: [{
        selector: 'node',
        style: {
            "text-valign": "center",
            "text-halign": "center",
            "color": '#333',
            "font-size": "8px",
            "font-family": "helvetica",
            "label": 'data(label)',
            "width": 'data(weight)',
            "height": 'data(weight)',
            "text-wrap": "wrap",
            "text-max-width": 'data(weight)',
            'background-color': 'data(color)',
            'z-index': 'data(weight)',
        }
    },
    {
        selector: 'edge',
        style: {
            'opacity': EDGE_OPACITY,
            'width': 'data(weight)',
            'line-color': '#666',
            'target-arrow-color': '#666',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'color': '#ccc',
            "font-size": "6px",
            "font-family": "helvetica",
            'text-background-color': '#111',
            'text-background-opacity': 0.75,
            'text-background-padding': '1px',
            'text-wrap': 'wrap',
            'text-max-width': '50',
        }
    }
    ]
});


cy.layout({
    name: 'fcose',
    animate: false,
    quality: 'proof',
    fit: true,
    nodeDimensionsIncludeLabels: true,
    idealEdgeLength: edge => 75,
    nodeRepulsion: node => 145000,
    numIter: 5000,
}).run();


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



let highlightedNodes = [];
const addNodeToHighlightSet = (id) => {
    if (!highlightedNodes.includes(id)) {
        highlightedNodes.push(id);
    }
}

const removeNodeFromHighlightSet = (id) => {
    const idx = highlightedNodes.indexOf(id);
    if (idx != -1) {
        highlightedNodes.splice(idx, 1);
    }
}

const nodeIsHighlighted = (id) => {
    return highlightedNodes.includes(id);
}

const nodeHighlightToggle = (id) => {
    if (nodeIsHighlighted(id)) {
        resetNode(id);
    } else {
        highlightNode(id);
    }
}

let highlightedEdges = [];
const addEdgeToHighlightSet = (id) => {
    if (!highlightedEdges.includes(id)) {
        highlightedEdges.push(id);
    }
}

const removeEdgeFromHighlightSet = (id) => {
    const idx = highlightedEdges.indexOf(id);
    if (idx != -1) {
        highlightedEdges.splice(idx, 1);
    }
}

const edgeIsHighlighted = (id) => {
    return highlightedEdges.includes(id);
}

const edgeHighlightToggle = (id) => {
    if (edgeIsHighlighted(id)) {
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
        addNodeToHighlightSet(id);
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
            addEdgeToHighlightSet(edge['data']['id']);
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
        removeNodeFromHighlightSet(id);
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
            removeEdgeFromHighlightSet(edge['data']['id']);
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
        edge.style('line-color', 'white');
        edge.style('target-arrow-color', 'white');
        edge.style('opacity', EDGE_HIGH_OPACITY);
        addEdgeToHighlightSet(id);
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
        removeEdgeFromHighlightSet(id);
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
            if (!nodeIsHighlighted(id)) {
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
