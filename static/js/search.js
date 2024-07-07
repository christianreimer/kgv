import Fuse from '/vendor/fuse.js@7.0.0/fuse.mjs'

import {
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
} from './graph.js'

const highlightNodesAndAdges = (result) => {
    const nodesToHighlight = result.filter((r) => r['item']['type'] == 'node').map((r) => r['item']['id']);
    const nodesToUnhighlight = state.highlightedNodes.filter((id) => nodesToHighlight.indexOf(id) == -1);

    if (nodesToHighlight.length > 0) {
        let url = `http://localhost:8080/api/nodes/${nodesToHighlight.join(',')}`;

        fetch(url).then((resp) => {
            if (resp.ok) {
                return resp.json();
            }
            throw new Error(`Failed to fetch from ${url}`);
        }).then((data) => {
            data.forEach((node) => {
                highlightNode(node);
                state.addNodeToHighlightSet(node['data']['id']);
            });
        }).catch((error) => {
            console.error(error)
        });
    }

    if (nodesToUnhighlight.length > 0) {
        let url = `http://localhost:8080/api/nodes/${nodesToUnhighlight.join(',')}`;

        fetch(url).then((resp) => {
            if (resp.ok) {
                return resp.json();
            }
            throw new Error(`Failed to fetch from ${url}`);
        }).then((data) => {
            data.forEach((node) => {
                unhighlightNode(node);
                state.removeNodeFromHighlightSet(node['data']['id']);
            });
        }).catch((error) => {
            console.error(`Failed to fetch from ${url}`)
        });
    }

    let edgesToHighlight = result.filter((r) => r['item']['type'] == 'edge').map((r) => r['item']['id']);
    const edgesToUnhighlight = state.highlightedEdges.filter((id) => edgesToHighlight.indexOf(id) == -1);

    if (edgesToHighlight.length > 0) {
        let url = `http://localhost:8080/api/edges/${edgesToHighlight.join(',')}`;

        fetch(url).then((resp) => {
            if (resp.ok) {
                return resp.json();
            }
            throw new Error(`Failed to fetch from ${url}`);
        }).then((data) => {
            data.forEach((edge) => {
                highlightEdge(edge);
                state.addEdgeToHighlightSet(edge['data']['id']);
            });

        }).catch((error) => {
            console.error(error)
        });
    }

    if (edgesToUnhighlight.length > 0) {
        let url = `http://localhost:8080/api/edges/${edgesToUnhighlight.join(',')}`;

        fetch(url).then((resp) => {
            if (resp.ok) {
                return resp.json();
            }
            throw new Error(`Failed to fetch from ${url}`);
        }).then((data) => {
            data.forEach((edge) => {
                unhighlightEdge(edge);
                state.removeEdgeFromHighlightSet(edge['data']['id']);
            });

        }).catch((error) => {
            console.error(error)
        });
    }
}

const list = await fetch('http://localhost:8080/api/autocomplete')
    .then(response => response.json())
    .then(data => {
        return data
    })
    .catch(error => {
        console.error('Error:', error);
    });

const fuseOptions = {
    // isCaseSensitive: false,
    // includeScore: false,
    shouldSort: true,
    // includeMatches: false,
    // findAllMatches: false,
    minMatchCharLength: 1,
    // location: 0,
    threshold: 0.4,
    // distance: 100,
    // useExtendedSearch: false,
    // ignoreLocation: false,
    // ignoreFieldNorm: false,
    // fieldNormWeight: 1,
    keys: [
        "label",
    ]
};

const debounce = (func, timeout = 250) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

const fuse = new Fuse(list, fuseOptions);

let elem = document.getElementById("searchInput");
elem.addEventListener("input", function (e) {
    const searchPattern = e.target.value
    const result = fuse.search(searchPattern)

    const updateGraph = debounce((result) => highlightNodesAndAdges(result));
    updateGraph(result);

    const updateResults = debounce((result) => updateResultList(result));
    updateResults(result);
});

const updateResultList = (result) => {
    let list = document.createElement("ul");
    list.classList.add("no-bullets");

    if (result.length > 20) {
        result = result.slice(0, 20);
    }

    let counter = 1;
    result.forEach((r) => {
        let elem = document.createElement("li");
        elem.setAttribute('data-id', r['item']['id']);
        elem.setAttribute('data-type', r['item']['type'])
        elem.textContent = r['item']['label'];
        elem.tabIndex = counter++;
        elem.addEventListener("click", (event) => {
            console.log("Clicked on " + event.target);
        });
        elem.addEventListener('keydown', updateSelection);
        list.appendChild(elem);
    });

    let results = document.getElementById("resultList");
    results.innerHTML = "";
    results.appendChild(list);
}




let currentFocus = -1;
const updateSelection = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Click'].includes(event.key)) {
        return;
    }

    let resultListElem = document.getElementById("resultList");
    const results = resultListElem.querySelectorAll('li');
    if (results.length === 0) {
        return
    }
    event.preventDefault();

    if (event.target.localName === 'input' && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        if (event.key == 'ArrowDown') {
            currentFocus = 0;
        } else {
            currentFocus = results.length - 1;
        }
        results[currentFocus].focus();
    }

    if (event.target.localName === 'li' && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        if (event.key == 'ArrowDown') {
            currentFocus = ++currentFocus % (results.length);
        } else {
            currentFocus = --currentFocus;
            if (currentFocus < 0) {
                currentFocus = results.length - 1;
            }
        }
        results[currentFocus].focus();
    }

    if (event.target.localName === 'li' && event.key === 'Enter') {
        document.querySelector('#searchInput > input').value = '';
        const id = results[currentFocus].getAttribute('data-id');
        const type = results[currentFocus].getAttribute('data-type');
        stopSearchWithResult(id, type);
    }

    if (event.key === 'Escape') {
        document.querySelector('#searchInput > input').value = '';
        document.getElementById("resultList").innerHTML = '';
    }
}

const stopSearchWithResult = (id, type) => {
    document.getElementById("searchInput").value = "";
    document.getElementById("resultList").innerHTML = "";

    // Unhighlight all nodes and edges except for the serach result
    highlightNodesAndAdges([]);

    if (type == 'node') {
        selectNode(id);
    } else {
        selectEdge(id);
    }
}

document.getElementById("searchInput").addEventListener('keyup', updateSelection);

document.getElementById("zoomResetButton").addEventListener('click', () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("resultList").innerHTML = "";
    // highlightNodesAndAdges([]);
    reset();
});

document.getElementById("zoomInButton").addEventListener('click', () => {
    zoomIn();
});

document.getElementById("zoomOutButton").addEventListener('click', () => {
    zoomOut();
});

document.getElementById("resenterButton").addEventListener('click', () => {
    recenter();
});