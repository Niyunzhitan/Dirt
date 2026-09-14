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

test("verified connection failure is displayed as disconnected", () => {
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

  assert.match(statusElement.innerHTML, /连接失败/);
  assert.equal(classes.has("disconnected"), true);
  assert.equal(classes.has("checking"), false);
});

test("failed probe and failed chat are not marked as still checking; success recovers", async () => {
  const browserWindow = new EventTarget();
  browserWindow.location = { protocol: "https:", origin: "https://example.test" };
  const statuses = [];
  browserWindow.addEventListener("ai-status-change", (event) => statuses.push(event.detail));
  let succeeds = false;
  const context = runBrowserScript("js/ai-service.js", {
    window: browserWindow,
    fetch: async (url) => ({
      ok: url.endsWith("/status") || succeeds,
      status: succeeds ? 200 : 500,
      json: async () => url.endsWith("/status")
        ? { connected: false, configured: true, verified: true }
        : succeeds ? { reply: "OK" } : { error: "InternalError", errorCode: "UPSTREAM_HTTP_500" },
    }),
  });
  const status = await context.window.AiService.getStatus();
  assert.equal(Boolean(status.checking), false);
  await assert.rejects(context.window.AiService.chat({ message: "test" }), /UPSTREAM_HTTP_500/);
  assert.equal(statuses.at(-1).connected, false);
  assert.equal(statuses.at(-1).checking, false);
  succeeds = true;
  await context.window.AiService.chat({ message: "test" });
  assert.equal(statuses.at(-1).connected, true);
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
