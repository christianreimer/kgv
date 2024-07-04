

var knowledge_graph_json = {};

// https://javascript.info/fetch
let response = await fetch('./data.json');

if (response.ok) { // if HTTP-status is 200-299
    knowledge_graph_json = await response.json();
} else {
    alert("HTTP-Error: " + response.status);
}


var nodes = []
var edges = []

for (const i in knowledge_graph_json['entities']) {
    nodes.push({
        data: {
            id: knowledge_graph_json['entities'][i]['id'],
            title: knowledge_graph_json['entities'][i]['title'],
            size: knowledge_graph_json['entities'][i]['title'].length * 3,
            color: knowledge_graph_json['entities'][i]['color']
        }
    });
}

for (const i in knowledge_graph_json['relations']) {
    edges.push({
        data: {
            id: i,
            source: knowledge_graph_json['relations'][i]['source'],
            target: knowledge_graph_json['relations'][i]['target'],
            label: knowledge_graph_json['relations'][i]['type'],
            weight: knowledge_graph_json['relations'][i]['weight'],
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
                "color": '#ccc',
                "font-size": "10px",
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
                'width': 2,
                'line-color': '#333',
                'target-arrow-color': '#333',
                'target-arrow-shape': 'triangle',
                'curve-style': 'bezier',
                'label': 'data(label)',
                'color': '#ccc',
                "font-size": "6px",
                "font-family": "helvetica",
                'text-background-color': '#123',
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
    tile: true,
}).run();

function makePopper(ele) {
    let ref = ele.popperRef(); // used only for positioning

    ele.tippy = tippy(ref, {
        content: function () {
            let div = document.createElement('div');
            // document.body.appendChild(div);
            let contentText = "<div id=" + ele.id() + "></div";
            div.innerHTML = contentText;
            return div;
        },
        onShow: () => {
            fetch('./tooltips.json')
                .then(response => response.json())
                .then(data => {
                    const i = data["tooltips"].findIndex((e) => e.id === ele.id());
                    // let content = data["tooltips"].filter((e) => e.id === ele.id());
                    let html;
                    if (i > -1) {
                        html = data["tooltips"][i]["html"]
                    } else {
                        html = "No tooltip available for this entity."
                    }

                    ref._tippy.setContent(html);
                });
        },
        trigger: 'manual',
        arrow: true,
    });
}

cy.ready(() => {
    cy.elements().forEach(function (ele) {
        makePopper(ele);
    });
});

cy.elements().unbind('mouseover');
cy.elements().bind('mouseover', (event) => {
    event.target.tippy.show();
});

cy.elements().unbind('mouseout');
cy.elements().bind('mouseout', (event) => event.target.tippy.hide());
