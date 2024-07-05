var jsonData = {};
var nodes = []
var edges = []

// https://javascript.info/fetch
// let response = await fetch('./data.json');
let response = await fetch('http://localhost:8080/api/graph');
console.log(response);

if (response.ok) { // if HTTP-status is 200-299
    jsonData = await response.json();
    console.log(jsonData);
} else {
    alert("HTTP-Error: " + response.status);
}

nodes = jsonData['nodes'];
edges = jsonData['edges'];


// for (const i in jsonData['nodes']) {
//     nodes.push({
//         data: {
//             id: jsonData['nodes'][i]['id'],
//             label: jsonData['nodes'][i]['label'],
//             size: jsonData['nodes'][i]['weight'],
//             color: jsonData['nodes'][i]['color']
//         }
//     });
// }

// for (const i in jsonData['edges']) {
//     edges.push({
//         data: {
//             id: jsonData['edges'][i]['id'],
//             source: jsonData['edges'][i]['source'],
//             target: jsonData['edges'][i]['target'],
//             label: jsonData['edges'][i]['label'],
//             weight: jsonData['edges'][i]['weight'],
//         }
//     });
// }

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
                "label": 'data(label)',
                "width": 'data(weight)',
                "height": 'data(weight)',
                "text-wrap": "wrap",
                "text-max-width": 'data(weight)',
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

            fetch('http://localhost:8080/api/tooltip/' + ele.id())
                .then(response => response.json())
                .then(data => {
                    console.log(data);
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
