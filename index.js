// Assignment 1
// "...5 interactive elements" Well, I think let's make the whole site interactive.

// Plan:
//  - Generative vdom representation of the site (snapshot)
//  - Use this representation to detect changes in the HTML
//  - Add some sort of "edit"-button that will give each dom-element the attribute contenteditable="true" (it will not work well enough to give it just to the body)
//  - use the structure and some events to save changes to the LocalStorage
//  - On Revisit: Load from LocalStorage if snapshot matches the structure

// generate a virtual DOM
const generateVirtualDOM = async (element, layer = 0) => {
  let children = [];

  if (element.tagName === undefined) {
    return;
  }

  for (let node of element.childNodes) {
    const nodeRepresentation = await generateVirtualDOM(node, layer + 1);

    nodeRepresentation && children.push(nodeRepresentation);
  }

  return { [element.tagName]: children };
};

// pretty print a tree of the structure
const printLayer = (vdom, layer = 1) => {
  for (let [tagName, children] of Object.entries(vdom)) {
    const layerIndicator = " ".repeat(2 * (layer - 1)) + "└";
    console.log(`${layerIndicator} ${tagName}`);
    children.forEach((node) => printLayer(node, layer + 1));
  }
};

const vdom = generateVirtualDOM(document.body);

vdom.then(JSON.stringify).then(console.log);
vdom.then((vdom) => printLayer(vdom));
