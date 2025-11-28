import "../styles/toast.css";

let toastRoot;
let toastTimer;

const ensureRoot = () => {
  if (!toastRoot) {
    toastRoot = document.createElement("div");
    document.body.appendChild(toastRoot);
  }
};

const show = (message) => {
  ensureRoot();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  toastRoot.appendChild(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.remove();
  }, 2200);
};

const Toast = { show };

export default Toast;
