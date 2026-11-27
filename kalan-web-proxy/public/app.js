const address = document.querySelector("#address");
const goButton = document.querySelector("#go");
const frameElement = document.querySelector("#browser-frame");
const status = document.querySelector("#status");
const home = document.querySelector("#home");
let browserFrame;

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

async function startProxy() {
  status.textContent = "Starting browser engine…";
  if (!("serviceWorker" in navigator)) throw new Error("This browser does not support service workers.");
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;

  if (!navigator.serviceWorker.controller) {
    await new Promise((resolve) => {
      navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
    });
  }
  const serviceworker = navigator.serviceWorker.controller ?? registration.active;
  if (!serviceworker) throw new Error("The browser service worker did not start.");

  for (const src of ["/scram/scramjet.js", "/controller/controller.api.js", "/utils/scramjet-utils.js"]) {
    await loadScript(src);
  }

  const api = window.$scramjetController;
  const utils = window.$scramjetUtils;
  const { default: LibcurlClient } = await import("/libcurl/index.mjs");
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  const transport = new LibcurlClient({ wisp: `${scheme}//${location.host}/wisp/` });
  const controller = new api.Controller({
    serviceworker,
    transport,
    config: {
      scramjetPath: "/scram/scramjet.js",
      wasmPath: "/scram/scramjet.wasm",
      injectPath: "/controller/controller.inject.js"
    }
  });
  await controller.wait();

  browserFrame = controller.createFrame(frameElement, {
    plugins: [
      new utils.UrlWatcherPlugin((url) => {
        address.value = url;
        status.textContent = "Connected · " + new URL(url).hostname;
      }),
      new utils.CatchEscapedLinksPlugin(() => new URL(location.href))
    ]
  });

  window.setInterval(() => {
    navigator.serviceWorker.controller?.postMessage("keepalive");
  }, 15000);
  status.textContent = "Ready · enter a website above";
}

function navigate() {
  const url = normalizeAddress(address.value);
  if (!url) {
    status.textContent = "Enter a valid website address or search phrase.";
    return;
  }
  if (!browserFrame) {
    status.textContent = "The browser engine is not ready yet.";
    return;
  }
  home.hidden = true;
  frameElement.hidden = false;
  status.textContent = "Connecting…";
  browserFrame.go(url);
}

goButton.addEventListener("click", navigate);
address.addEventListener("keydown", (event) => {
  if (event.key === "Enter") navigate();
});
document.querySelector("#back").addEventListener("click", () => {
  try { frameElement.contentWindow.history.back(); } catch {}
});
document.querySelector("#forward").addEventListener("click", () => {
  try { frameElement.contentWindow.history.forward(); } catch {}
});
document.querySelector("#reload").addEventListener("click", () => {
  try { frameElement.contentWindow.location.reload(); } catch {}
});

startProxy().catch((error) => {
  console.error(error);
  status.textContent = "Could not start: " + error.message;
  document.querySelector("#home-title").textContent = "Browser engine needs attention";
  document.querySelector("#home-copy").textContent = "The local proxy service is running, but its browser engine did not finish starting. Check the Docker logs.";
});
