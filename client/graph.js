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

function makePopper(ele) {
    let ref = ele.popperRef();

    ele.tippy = tippy(ref, {
        onShow: () => {
            return createTippy(ref, ele);
        },
        trigger: 'manual',
        interactive: true,
        arrow: true,
        hideOnClick: false,
    });
}

cy.ready(() => {
    cy.elements().forEach(function (ele) {
        makePopper(ele);
    });
});


// Toggle highlight of edges on click
let highlightedNodes = [];
cy.elements().unbind('click')
cy.elements().bind('click', (event) => {
    const id = event.target.id();
    const idx = highlightedNodes.indexOf(id)

    // Remove highlight
    if (idx != -1) {
        unHighlightNode(id);
        highlightedNodes.splice(idx, 1);
    } else {
        highlightNode(id);
        highlightedNodes.push(id);
    }
});

// Show tooltip on right click
cy.on('cxttap', "node", (event) => {
    event.target.tippy.show();
});


// Highlight a node and its connected edges
const highlightNode = (id) => {
    fetch(`${SERVER_URL}/edges/${id}`)
        .then(resp => resp.json())
        .then(data => {
            data.forEach((edgeId) => {
                let edge = cy.getElementById(edgeId)
                edge.style('line-color', 'white');
                edge.style('target-arrow-color', 'white');
                edge.style('opacity', EDGE_HIGH_OPACITY)
            });
        });

    fetch(`${SERVER_URL}/node/${id}`)
        .then(resp => resp.json())
        .then(data => {
            let node = cy.getElementById(id);
            node.style('background-color', data["data"]["highlightColor"]);
            node.style('width', data["data"]["weight"] * 1.1);
            node.style('height', data["data"]["weight"] * 1.15);
        });
}


const unHighlightNode = (id) => {
    fetch(`${SERVER_URL}/edges/${id}`)
        .then(resp => resp.json())
        .then(data => {
            data.forEach((edgeId) => {
                let edge = cy.getElementById(edgeId)
                edge.style('line-color', '#666');
                edge.style('target-arrow-color', '#666');
                edge.style('opacity', EDGE_OPACITY)
            });
        });

    fetch(`${SERVER_URL}/node/${id}`)
        .then(resp => resp.json())
        .then(data => {
            let node = cy.getElementById(id);
            node.style('background-color', 'red');
            node.style('background-color', data["data"]["color"]);
            node.style('width', data["data"]["weight"]);
            node.style('height', data["data"]["weight"]);
        });
}

const createTippy = (ref, ele) => {
    // Clicking the node is a toggle, so if already shown, hide it
    if (ref._tippy.shown) {
        ref._tippy.hide();
        ref._tippy.shown = false;
        return false;
    }

    let id = ele.id();
    fetch(`${SERVER_URL}/tooltip/${id}`)
        .then(resp => resp.json())
        .then(data => {
            let div = document.createElement('div');
            div.classList.add('ttip');
            div.addEventListener('click', () => {
                ref._tippy.hide();
                ref._tippy.shown = false;
            });
            div.innerHTML = data['description'];
            ref._tippy.setContent(div);
            ref._tippy.shown = true;
        });

    return true;
}
