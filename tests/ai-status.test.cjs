const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");

function runBrowserScript(relativePath, additions = {}) {
  const window = additions.window || {};
  window.sessionStorage ||= {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
  };
  const context = vm.createContext({
    AbortSignal,
    CustomEvent,
    EventTarget,
    FileReader: class FileReader {},
    URL,
    console,
    fetch: additions.fetch,
    window,
  });
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
  return context;
}

test("status transport failure remains unknown instead of claiming AI is offline", async () => {
  const browserWindow = new EventTarget();
  browserWindow.location = {
    protocol: "https:",
    origin: "https://example.test",
  };
  browserWindow.APP_CONFIG = {};

  const context = runBrowserScript("js/ai-service.js", {
    window: browserWindow,
    fetch: async () => {
      throw new DOMException("Timed out", "TimeoutError");
    },
  });

  const status = await context.window.AiService.getStatus();

  assert.equal(status.connected, null);
  assert.equal(status.checking, true);
});

test("configured but temporarily unreachable AI remains available to try", () => {
  const context = runBrowserScript("js/ai-chat.js");
  const classes = new Set();
  const statusElement = {
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
    innerHTML: "",
  };
  const controller = context.window.NiyunAiChat.create({
    $: (selector) => (selector === "#aiStatus" ? statusElement : null),
    $$: () => [],
    escapeHtml: String,
    renderMarkdown: String,
    showToast() {},
    aiService: {},
    sessionStorageKey: "test",
  });

  controller.renderStatus({ connected: false, configured: true, verified: true });

  assert.match(statusElement.innerHTML, /仍可继续提问/);
  assert.equal(classes.has("disconnected"), false);
  assert.equal(classes.has("checking"), true);
});

test("missing AI configuration is still shown as unavailable", () => {
  const context = runBrowserScript("js/ai-chat.js");
  const classes = new Set();
  const statusElement = {
    classList: {
      toggle(name, enabled) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
    innerHTML: "",
  };
  const controller = context.window.NiyunAiChat.create({
    $: (selector) => (selector === "#aiStatus" ? statusElement : null),
    $$: () => [],
    escapeHtml: String,
    renderMarkdown: String,
    showToast() {},
    aiService: {},
    sessionStorageKey: "test",
  });

  controller.renderStatus({ connected: false, configured: false, verified: true });

  assert.match(statusElement.innerHTML, /打了个小盹/);
  assert.equal(classes.has("disconnected"), true);
  assert.equal(classes.has("checking"), false);
});
