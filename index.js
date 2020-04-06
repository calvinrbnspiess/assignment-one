// Assignment 1
// "...5 interactive elements" Well, I think let's make the whole site interactive.

// Plan:
//  - Generative vdom representation of the site (snapshot) ✅
//  - Use this representation to detect changes in the HTML ✅
//  - Add some sort of "edit"-button that will give (🚫) each dom-element the attribute contenteditable="true" (it will not work well enough to give it just to the body) (✅)
//  - use the structure and some events to save changes to the LocalStorage ✅
//  - On Revisit: Load from LocalStorage if snapshot matches the structure ✅
//  - Edit Mode Indicator
//  - Code cleanup, minor improvements

const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const loadWidget = () => {
  const container = document.createElement("div");

  // shadow dom will prevent indexing in snapshot (except outer div)
  container.attachShadow({ mode: "open" });

  const style = document.createElement("link");

  style.setAttribute("rel", "stylesheet");
  style.setAttribute("type", "text/css");
  style.setAttribute("href", "cms.css");
  container.shadowRoot.append(style);

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

  container.shadowRoot.append(cmsWidget);

  document.body.appendChild(container);

  window.overlay = overlay;

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

  return {
    [element.tagName]: children,
    text: element.children.length === 0 ? element.innerText : undefined,
  };
};

// pretty print a tree of the structure
const printLayer = (vdom, layer = 1) => {
  let [tagName, children] = Object.entries(vdom)[0];
  let text = vdom["text"];

  const layerIndicator = " ".repeat(2 * (layer - 1)) + "└";
  console.log(
    `${layerIndicator} ${tagName}${text !== undefined ? ": " + text : ""}`
  );
  children.forEach((node) => printLayer(node, layer + 1));
};

// make an element and its children contenteditable
const makeEditable = (element) => {
  if (element.children.length === 0) {
    element.setAttribute("contenteditable", true);
    element.addEventListener("input", async (event) => {
      window.overlay.innerText = "Saving ...";
      console.log(
        `input event fired on ${event.target}. Value is: ${event.target.innerText}`
      );
      const vdom = await generateVirtualDOM(document.body);
      console.log(vdom);
      localStorage.setItem("snapshot", JSON.stringify(vdom));
      window.overlay.innerText = "Saved.";
    });
    return;
  }

  Array.from(element.children).forEach(makeEditable);
};

const readSnapshot = (vdom, element) => {
  let [tagName, children] = Object.entries(vdom)[0];
  let text = vdom["text"];

  if (text !== undefined) {
    console.log(element);
    console.log("Text is not undefined: " + text);
    element.innerText = text;
  }

  children.forEach((node, index) =>
    readSnapshot(node, element.children[index])
  );
};

const vdomFilterText = (vdom) => {
  let [tagName, children = []] = Object.entries(vdom)[0];
  return { [tagName]: children.map(vdomFilterText) };
};

const overlay = loadWidget();

const vdom = generateVirtualDOM(document.body);

vdom.then(JSON.stringify).then(console.log);
vdom.then((vdom) => printLayer(vdom));
vdom.then((vdom) => {
  const snapshot = JSON.stringify(vdomFilterText(vdom));
  const prev_snapshot = localStorage.getItem("snapshot");
  if (prev_snapshot === null) {
    overlay.innerText = "Creating new snapshot ...";
    localStorage.setItem("snapshot", JSON.stringify(vdom));
  } else if (
    snapshot === JSON.stringify(vdomFilterText(JSON.parse(prev_snapshot)))
  ) {
    overlay.innerText = "Snapshot is matching.";

    readSnapshot(JSON.parse(prev_snapshot), document.body);
  } else {
    overlay.innerText = "Site Structure does not match snapshot.";
    return;
  }

  makeEditable(document.body);
  overlay.innerText = "Everything loaded!";
});
