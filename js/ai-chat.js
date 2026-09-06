(function () {
  "use strict";

  window.NiyunAiChat = {
    create(dependencies) {
      const { $, $$, escapeHtml, renderMarkdown, showToast, aiService, sessionStorageKey } = dependencies;
      let selectedImages = [];
      let sessionId = window.sessionStorage.getItem(sessionStorageKey) || "";

      function appendMessage(text, role) {
        const messages = $("#chatMessages");
        const message = document.createElement("div");
        message.className = `chat-message ${role}`;
        message.textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
      }

      function normalizeDisplayedAiName(text) {
        return String(text || "").replaceAll("于见泥", "印小灵");
      }

      function renderSelectedImages() {
        const preview = $("#uploadPreview");
        preview.hidden = selectedImages.length === 0;
        $("#uploadCount").textContent = `印小灵收到 ${selectedImages.length} 张图片啦`;
        $("#uploadThumbnails").innerHTML = selectedImages.map((item, index) => `<div class="upload-item"><img src="${item.previewUrl}" alt="待上传图片 ${index + 1}"><button type="button" data-remove-image="${item.id}" aria-label="移除${escapeHtml(item.file.name)}">×</button><span title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span></div>`).join("");
      }

      function clearSelectedImages() {
        selectedImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        selectedImages = [];
        $("#aiImage").value = "";
        renderSelectedImages();
      }

      async function send(message) {
        const images = selectedImages.map((item) => item.file);
        if (!message && !images.length) return;
        const uploadText = images.length ? `带了 ${images.length} 张图片给你看` : "";
        appendMessage([message, uploadText].filter(Boolean).join(" · "), "user");
        $("#aiQuestion").value = "";
        clearSelectedImages();
        const pending = appendMessage("印小灵正在翻翻小册子……", "assistant pending");
        const submitButton = $("#chatForm button[type='submit']");
        submitButton.disabled = true;
        try {
          const result = await aiService.chat({ message, images, sessionId });
          pending.innerHTML = renderMarkdown(normalizeDisplayedAiName(result.reply));
          pending.classList.remove("pending");
          if (result.sessionId) {
            sessionId = result.sessionId;
            window.sessionStorage.setItem(sessionStorageKey, sessionId);
          }
        } catch (error) {
          pending.textContent = `呜，线索暂时没接上：${normalizeDisplayedAiName(error.message)}`;
          pending.classList.remove("pending");
        } finally {
          submitButton.disabled = false;
        }
      }

      function renderStatus(status) {
        const element = $("#aiStatus");
        if (!element) return;
        element.classList.toggle("disconnected", !status.connected);
        element.innerHTML = `<i></i> ${status.connected ? "印小灵已经准备好啦" : "印小灵暂时打了个小盹"}`;
      }

      function init() {
        window.addEventListener("ai-status-change", (event) => renderStatus(event.detail || { connected: false }));
        $("#chatForm")?.addEventListener("submit", (event) => { event.preventDefault(); send($("#aiQuestion").value.trim()); });
        $$(`[data-prompt]`).forEach((button) => button.addEventListener("click", () => send(button.dataset.prompt)));
        $("#aiImage")?.addEventListener("change", () => {
          const files = [...$("#aiImage").files];
          const availableSlots = Math.max(0, 4 - selectedImages.length);
          const validFiles = files.filter((file) => {
            if (file.size > 5 * 1024 * 1024) { showToast(`${file.name} 太大啦，请换一张不超过 5MB 的图片`); return false; }
            return true;
          }).slice(0, availableSlots);
          if (files.length > availableSlots) showToast("印小灵一次最多能抱住 4 张图片哦");
          validFiles.forEach((file) => selectedImages.push({ id: `${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file) }));
          $("#aiImage").value = "";
          renderSelectedImages();
        });
        $("#uploadThumbnails")?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-remove-image]");
          if (!button) return;
          const index = selectedImages.findIndex((item) => item.id === button.dataset.removeImage);
          if (index < 0) return;
          URL.revokeObjectURL(selectedImages[index].previewUrl);
          selectedImages.splice(index, 1);
          renderSelectedImages();
        });
        $("#clearImages")?.addEventListener("click", clearSelectedImages);
        $("#clearChat")?.addEventListener("click", () => {
          $("#chatMessages").innerHTML = '<div class="chat-message assistant">小黑板擦干净啦！重新开始吧，想聊封泥或别的小问题都可以。</div>';
          sessionId = "";
          window.sessionStorage.removeItem(sessionStorageKey);
          clearSelectedImages();
        });
      }

      return { init, renderStatus };
    }
  };
}());
