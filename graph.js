var jsonData = {};
var nodes = []
var edges = []

// https://javascript.info/fetch
let response = await fetch('./data.json');

if (response.ok) { // if HTTP-status is 200-299
    jsonData = await response.json();
} else {
    alert("HTTP-Error: " + response.status);
}



for (const i in jsonData['entities']) {
    nodes.push({
        data: {
            id: jsonData['entities'][i]['id'],
            title: jsonData['entities'][i]['title'],
            size: jsonData['entities'][i]['title'].length * 4,
            color: jsonData['entities'][i]['color']
        }
    });
}

for (const i in jsonData['relations']) {
    edges.push({
        data: {
            id: i,
            source: jsonData['relations'][i]['source'],
            target: jsonData['relations'][i]['target'],
            label: jsonData['relations'][i]['type'],
            weight: jsonData['relations'][i]['weight'],
        }
    });
}

let cy = cytoscape({
    container: document.getElementById('cy'),
    elements: {
        nodes: nodes,
        edges: edges
    },
    style: [
        {
            selector: 'node',
            style: {
                "text-valign": "center",
                "text-halign": "center",
                "color": '#333',
                "font-size": "8px",
                "font-family": "helvetica",
                "label": 'data(title)',
                "width": 'data(size)',
                "height": 'data(size)',
                "text-wrap": "wrap",
                "text-max-width": 'data(size)',
                'background-color': 'data(color)',
            }
        },
        {
            selector: 'edge',
            style: {
                'opacity': 1,
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
    idealEdgeLength: edge => 50,
    nodeRepulsion: node => 14500,
    numIter: 5000,
}).run();

function makePopper(ele) {
    let ref = ele.popperRef();

    ele.tippy = tippy(ref, {
        onShow: () => {
            // Clicking the node is a toggle, so if already shown, hide it
            if (ref._tippy.shown) {
                ref._tippy.hide();
                ref._tippy.shown = false;
                return false;
            }

            fetch('./tooltips.json')
                .then(response => response.json())
                .then(data => {
                    let content;
                    const i = data["tooltips"].findIndex((e) => e.id === ele.id());
                    if (i > -1) {
                        content = data["tooltips"][i]["html"];
                    }
                    else {
                        content = 'Such Emptiness 😞';
                    }

                    let div = document.createElement('div');
                    div.classList.add('ttip');
                    div.addEventListener('click', () => {
                        ref._tippy.hide();
                        ref._tippy.shown = false;
                    });
                    div.innerHTML = content;
                    ref._tippy.setContent(div);
                    ref._tippy.shown = true;
                });
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

cy.elements().unbind('click')
cy.elements().bind('click', (event) => {
    event.target.tippy.show();
});
