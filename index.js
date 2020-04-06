// Assignment 1
// "...5 interactive elements" Well, I think let's make the whole site interactive.

// Plan:
//  - Generative vdom representation of the site (snapshot) ✅
//  - Use this representation to detect changes in the HTML ✅
//  - Add some sort of "edit"-button that will give each dom-element the attribute contenteditable="true" (it will not work well enough to give it just to the body)
//  - use the structure and some events to save changes to the LocalStorage
//  - On Revisit: Load from LocalStorage if snapshot matches the structure

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const loadWidget = () => {
  const cmsWidget = document.createElement("div");
  cmsWidget.setAttribute("class", "cms-widget");

  const overlay = document.createElement("div");
  overlay.setAttribute("class", "overlay");
  overlay.innerText = "Loading...";

  const editButton = document.createElement("a");
  editButton.setAttribute("type", "button");
  editButton.setAttribute("class", "edit-button");

  const pencilIcon = document.createElement("img");
  pencilIcon.setAttribute("class", "edit-button--icon");
  pencilIcon.setAttribute("src", "pencil.svg");

  editButton.append(pencilIcon);

  cmsWidget.append(overlay);
  cmsWidget.append(editButton);

  document.body.appendChild(cmsWidget);

  return overlay;
};

// generate a virtual DOM
const generateVirtualDOM = async (element, layer = 0) => {
  let children = [];

  if (element.tagName === undefined) {
    return;
  }

  for (let node of element.children) {
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

// make an element and its children contenteditable
const makeEditable = (element) => {
  if (element.children.length === 0) {
    element.setAttribute("contenteditable", true);
    return;
  }

  Array.from(element.children).forEach(makeEditable);
};

const overlay = loadWidget();

const vdom = generateVirtualDOM(document.body);

vdom.then(JSON.stringify).then(console.log);
vdom.then((vdom) => printLayer(vdom));
vdom.then(async (vdom) => {
  const snapshot = JSON.stringify(vdom);
  const prev_snapshot = localStorage.getItem("snapshot");

  if (prev_snapshot === null) {
    overlay.innerText = "Creating new snapshot ...";
    localStorage.setItem("snapshot", JSON.stringify(vdom));
  } else if (snapshot === prev_snapshot) {
    overlay.innerText = "Snapshot is matching.";
  } else {
    overlay.innerText = "Site Structure does not match snapshot.";
    return;
  }

  await sleep(2000);
  makeEditable(document.body);
  overlay.innerText = "Everything loaded!";
});
