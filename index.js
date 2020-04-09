// Assignment 1
// "...5 interactive elements" Well, I think let's make the whole site interactive.

// Plan:
//  - Generative vdom representation of the site (snapshot) ✅
//  - Use this representation to detect changes in the HTML ✅
//  - Add some sort of "edit"-button that will give (✅) each dom-element the attribute contenteditable="true" (it will not work well enough to give it just to the body) (✅)
//  - use the structure and some events to save changes to the LocalStorage ✅
//  - On Revisit: Load from LocalStorage if snapshot matches the structure ✅
//  - Add key handler for ESC to exit edit mode
//  - Add visual border to editable elements instead of ugly outline :) (not a necessary feature at all) ✅
//  - Edit Mode Indicator ✅
//  - Code cleanup, minor improvements

const EDITOR_STATE = {
  COMPARING_SNAPSHOT: 0,
  LOADING_SNAPSHOT: 1,
  MISMATCHING_SNAPSHOT: 2,
  NO_SNAPSHOT: 3,
  IDLE: 4,
  EDITING: 5,
  SAVING_SNAPSHOT: 6,
};

class EditorControls {
  constructor() {
    const container = document.createElement("div");

    // shadow dom will prevent indexing in snapshot (except outer div)
    container.attachShadow({ mode: "open" });

    container.shadowRoot.append(this.getStyleElement());

    this.controlsElement = this.getOuterControlsElement();
    this.toastElement = this.getToastElement();
    this.editButton = this.getEditButton();

    this.controlsElement.append(this.toastElement);
    this.controlsElement.append(this.editButton);

    container.shadowRoot.append(this.controlsElement);

    document.body.appendChild(container);

    this.setState(EDITOR_STATE.COMPARING_SNAPSHOT);
  }

  getStyleElement() {
    const style = document.createElement("link");

    style.setAttribute("rel", "stylesheet");
    style.setAttribute("type", "text/css");
    style.setAttribute("href", "cms.css");

    return style;
  }

  getOuterControlsElement() {
    const cmsWidget = document.createElement("div");
    cmsWidget.setAttribute("class", "cms-widget");

    return cmsWidget;
  }

  getToastElement() {
    const toast = document.createElement("div");
    toast.setAttribute("class", "toast");

    return toast;
  }

  getEditButton() {
    const editButton = document.createElement("a");
    editButton.setAttribute("type", "button");
    editButton.setAttribute("class", "edit-button");

    const pencilIcon = document.createElement("img");
    pencilIcon.setAttribute("class", "edit-button--icon");
    pencilIcon.setAttribute("src", "pencil.svg");

    editButton.append(pencilIcon);

    editButton.addEventListener("click", () => {
      console.log("clicky");
      console.log(this.state);
      if (this.state === EDITOR_STATE.IDLE) {
        this.setState(EDITOR_STATE.EDITING);
      } else if (this.state === EDITOR_STATE.EDITING) {
        this.setState(EDITOR_STATE.IDLE);
      } else if (this.state === EDITOR_STATE.SAVING_SNAPSHOT) {
        this.toastElement.innerText = "I'm busy.";
      }
    });

    return editButton;
  }

  async setState(state) {
    console.log(state);

    let priorState = this.state;
    this.state = state;

    switch (state) {
      case EDITOR_STATE.COMPARING_SNAPSHOT:
        this.vdom = generateVirtualDOM(document.body);

        // this.vdom.then(JSON.stringify).then(console.log);
        // this.vdom.then((vdom) => printLayer(vdom));
        this.vdom.then((vdom) => {
          this.snapshot = JSON.stringify(vdomFilterText(vdom));
          this.prev_snapshot = localStorage.getItem("snapshot");

          if (this.prev_snapshot === null) {
            this.setState(EDITOR_STATE.NO_SNAPSHOT);
          } else if (
            this.snapshot ===
            JSON.stringify(vdomFilterText(JSON.parse(this.prev_snapshot)))
          ) {
            this.setState(EDITOR_STATE.LOADING_SNAPSHOT);
          } else {
            this.setState(EDITOR_STATE.MISMATCHING_SNAPSHOT);
          }
        });
        break;
      case EDITOR_STATE.NO_SNAPSHOT:
        this.toastElement.innerText = "No prior snapshot";
        localStorage.setItem("snapshot", JSON.stringify(this.vdom));
        this.setState(EDITOR_STATE.IDLE);
        break;
      case EDITOR_STATE.LOADING_SNAPSHOT:
        console.log("matching");
        this.toastElement.innerText = "Snapshot is matching.";
        readSnapshot(JSON.parse(this.prev_snapshot), document.body);
        this.setState(EDITOR_STATE.IDLE);
        console.log("idle");
        break;
      case EDITOR_STATE.MISMATCHING_SNAPSHOT:
        this.toastElement.innerText = "Mismatching snapshot.";
        break;
      case EDITOR_STATE.IDLE:
        console.log("this: " + this.state);
        if (priorState === EDITOR_STATE.EDITING) {
          disableEditable(document.body);
          this.toastElement.innerText = "Exited.";
        } else {
          this.toastElement.innerText = "Click the button to edit this page.";
        }
        break;
      case EDITOR_STATE.EDITING:
        console.log("editing");
        if (priorState === EDITOR_STATE.SAVING_SNAPSHOT) {
          this.toastElement.innerText = "Saved changes.";
        } else {
          makeEditable(document.body, (event) => {
            console.log(
              `input event fired on ${event.target}. Value is: ${event.target.innerText}`
            );
            this.setState(EDITOR_STATE.SAVING_SNAPSHOT);
          });
          this.toastElement.innerText = "Edit Mode";
        }
        break;
      case EDITOR_STATE.SAVING_SNAPSHOT:
        console.log("saving");
        this.toastElement.innerText = "Saving ...";

        this.vdom = await generateVirtualDOM(document.body);
        console.log(this.vdom);
        localStorage.setItem("snapshot", JSON.stringify(this.vdom));

        this.setState(EDITOR_STATE.EDITING);

        break;
    }
    console.log("setting state: " + state);
  }
}

const isTextElement = (element) =>
  element.children.length === 0 && !element.shadowRoot;

// generate a virtual DOM
const generateVirtualDOM = async (element, layer = 0) => {
  let children = [];

  if (element.tagName === undefined || element.shadowRoot) {
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

// strips of 'px' unit from string returned by window.getComputedStyle()
const cssValueToNumber = (i) => +i.replace("px", "");

const addToCSSValue = (value, increment) =>
  `${cssValueToNumber(value) + increment}px`;

// make an element and its children contenteditable
const makeEditable = (element, callback) => {
  if (isTextElement(element)) {
    element.setAttribute("contenteditable", true);

    const {
      marginTop,
      marginRight,
      marginBottom,
      marginLeft,
    } = window.getComputedStyle(element);

    const newMargin = `${addToCSSValue(marginTop, 5)} ${addToCSSValue(
      marginRight,
      5
    )} ${addToCSSValue(marginBottom, 5)} ${addToCSSValue(marginLeft, 5)}`;

    element.setAttribute(
      "style",
      `outline: 2px dashed grey; margin: ${newMargin}; transition: margin .2s ease`
    );
    element.addEventListener("input", callback);
    return;
  }

  Array.from(element.children).forEach((children) =>
    makeEditable(children, callback)
  );
};

const disableEditable = (element) => {
  if (isTextElement(element)) {
    element.setAttribute("contenteditable", false);
    element.setAttribute("style", "transition: margin .2s ease");
    return;
  }

  Array.from(element.children).forEach(disableEditable);
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

new EditorControls();
