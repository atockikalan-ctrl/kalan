const address = document.querySelector("#address");
const goButton = document.querySelector("#go");
const frameHost = document.querySelector("#browser-stage");
const status = document.querySelector("#status");
const home = document.querySelector("#home");
const tabStrip = document.querySelector("#tabs");
const newTabButton = document.querySelector("#new-tab");
let controller;
let utils;
let activeTabId = null;
let nextTabId = 1;
const tabs = [];

function normalizeAddress(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)
    ? trimmed
    : trimmed.includes(".") && !/\s/.test(trimmed)
      ? "https://" + trimmed
      : "https://duckduckgo.com/?q=" + encodeURIComponent(trimmed);
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function loadScript(src) {
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load " + src));
    document.head.append(script);
  });
}

function setStatus(message) {
  status.textContent = message;
}

function renderTabs() {
  tabStrip.replaceChildren();
  for (const tab of tabs) {
    const item = document.createElement("div");
    item.className = "tab" + (tab.id === activeTabId ? " active" : "");
    item.setAttribute("role", "tab");
    item.setAttribute("aria-selected", String(tab.id === activeTabId));

    const select = document.createElement("button");
    select.className = "tab-select";
    select.type = "button";
    select.textContent = tab.title;
    select.title = tab.url || "New tab";
    select.addEventListener("click", () => activateTab(tab.id));

    const close = document.createElement("button");
    close.className = "tab-close";
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close " + tab.title);
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(tab.id);
    });

    item.append(select, close);
    tabStrip.append(item);
  }
}

function activateTab(id) {
  const tab = tabs.find((item) => item.id === id);
  if (!tab) return;
  activeTabId = id;
  for (const item of tabs) item.frame.hidden = item.id !== id;
  home.hidden = Boolean(tab.url);
  address.value = tab.url || "";
  setStatus(tab.url ? "Connected · " + new URL(tab.url).hostname : "Ready · search or enter a website");
  renderTabs();
}

function updateTabFromUrl(tab, url) {
  tab.url = url;
  try {
    tab.title = new URL(url).hostname || "New tab";
  } catch {
    tab.title = "New tab";
  }
  if (tab.id === activeTabId) {
    address.value = url;
    setStatus("Connected · " + tab.title);
  }
  renderTabs();
}

function createTab(initialUrl = null) {
  const id = nextTabId++;
  const frame = document.createElement("iframe");
  frame.className = "browser-frame";
  frame.title = "KALAN Web tab " + id;
  frame.hidden = true;
  frameHost.append(frame);

  const tab = { id, title: "New tab", url: null, frame, browserFrame: null };
  tabs.push(tab);
  if (controller) {
    tab.browserFrame = controller.createFrame(frame, {
      plugins: [
        new utils.UrlWatcherPlugin((url) => updateTabFromUrl(tab, url)),
        new utils.CatchEscapedLinksPlugin(() => new URL(location.href))
      ]
    });
  }
  activateTab(id);
  if (initialUrl) navigateTo(initialUrl, tab);
  return tab;
}

function closeTab(id) {
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index < 0) return;
  const [tab] = tabs.splice(index, 1);
  tab.frame.remove();
  if (!tabs.length) {
    createTab();
    return;
  }
  if (activeTabId === id) activateTab(tabs[Math.min(index, tabs.length - 1)].id);
  else renderTabs();
}

function navigateTo(url, tab = tabs.find((item) => item.id === activeTabId)) {
  if (!tab?.browserFrame) {
    setStatus("The browser engine is not ready yet.");
    return;
  }
  home.hidden = true;
  tab.frame.hidden = false;
  tab.browserFrame.go(url);
}

function navigate() {
  const url = normalizeAddress(address.value);
  if (!url) {
    setStatus("Enter a valid website address or search phrase.");
    return;
  }
  navigateTo(url);
}

async function startProxy() {
  setStatus("Starting browser engine…");
  if (!("serviceWorker" in navigator)) throw new Error("This browser does not support service workers.");
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;

  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
  }
  const serviceworker = navigator.serviceWorker.controller ?? registration.active;
  if (!serviceworker) throw new Error("The browser service worker did not start.");

  for (const src of ["/scram/scramjet.js", "/controller/controller.api.js", "/utils/scramjet-utils.js"]) {
    await loadScript(src);
  }

  utils = window.$scramjetUtils;
  const { default: LibcurlClient } = await import("/libcurl/index.mjs");
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  const transport = new LibcurlClient({ wisp: `${scheme}//${location.host}/wisp/` });
  controller = new window.$scramjetController.Controller({
    serviceworker,
    transport,
    config: {
      scramjetPath: "/scram/scramjet.js",
      wasmPath: "/scram/scramjet.wasm",
      injectPath: "/controller/controller.inject.js"
    }
  });
  await controller.wait();

  createTab();
  window.setInterval(() => navigator.serviceWorker.controller?.postMessage("keepalive"), 15000);
  setStatus("Ready · search or enter a website");
}

goButton.addEventListener("click", navigate);
address.addEventListener("keydown", (event) => {
  if (event.key === "Enter") navigate();
});
newTabButton.addEventListener("click", () => createTab());
document.querySelector("#back").addEventListener("click", () => {
  const tab = tabs.find((item) => item.id === activeTabId);
  try { tab?.frame.contentWindow.history.back(); } catch {}
});
document.querySelector("#forward").addEventListener("click", () => {
  const tab = tabs.find((item) => item.id === activeTabId);
  try { tab?.frame.contentWindow.history.forward(); } catch {}
});
document.querySelector("#reload").addEventListener("click", () => {
  const tab = tabs.find((item) => item.id === activeTabId);
  try { tab?.frame.contentWindow.location.reload(); } catch {}
});
document.querySelector("#home-button").addEventListener("click", () => {
  const tab = tabs.find((item) => item.id === activeTabId);
  if (!tab) return;
  tab.url = null;
  tab.title = "New tab";
  tab.frame.hidden = true;
  activateTab(tab.id);
});

startProxy().catch((error) => {
  console.error(error);
  setStatus("Could not start: " + error.message);
  document.querySelector("#home-title").textContent = "Browser engine needs attention";
  document.querySelector("#home-copy").textContent = "The local proxy service is running, but its browser engine did not finish starting. Check the Docker logs.";
});
