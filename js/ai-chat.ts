const NiyunAiChat = (function registerAiChatController() {
  "use strict";

  return {
    create(dependencies: ChatDependencies) {
      const { $, $$, escapeHtml, renderMarkdown, showToast, aiService, sessionStorageKey } = dependencies;
      let selectedImages: SelectedImage[] = [];
      let sessionId = window.sessionStorage.getItem(sessionStorageKey) || "";

      function appendMessage(text: string, role: string) {
        const messages = $("#chatMessages");
        const message = document.createElement("div");
        message.className = `chat-message ${role}`;
        message.textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
      }

      function normalizeDisplayedAiName(text: string) {
        return String(text || "").replaceAll("于见泥", "印小灵");
      }

      function renderSelectedImages() {
        const preview = $("#uploadPreview");
        preview.hidden = selectedImages.length === 0;
        $("#uploadCount").textContent = `印小灵收到 ${selectedImages.length} 张图片啦`;
        $("#uploadThumbnails").innerHTML = selectedImages
          .map(
            (item, index) =>
              `<div class="upload-item"><img src="${item.previewUrl}" alt="待上传图片 ${index + 1}"><button type="button" data-remove-image="${item.id}" aria-label="移除${escapeHtml(item.file.name)}">×</button><span title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span></div>`,
          )
          .join("");
      }

      // 清空预览时释放临时图片地址，避免多次上传后一直占用内存。
      function clearSelectedImages() {
        selectedImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        selectedImages = [];
        ($("#aiImage") as HTMLInputElement).value = "";
        renderSelectedImages();
      }

      // 先显示用户消息和等待提示，再请求回答；成功或失败都要恢复发送按钮。
      async function send(message: string) {
        const images = selectedImages.map((item) => item.file);
        if (!message && !images.length) return;
        const uploadText = images.length ? `带了 ${images.length} 张图片给你看` : "";
        appendMessage([message, uploadText].filter(Boolean).join(" · "), "user");
        ($("#aiQuestion") as HTMLInputElement).value = "";
        clearSelectedImages();
        const pending = appendMessage("印小灵正在翻翻小册子……", "assistant pending");
        const submitButton = ($("#chatForm button[type='submit']") as HTMLButtonElement);
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

      function renderStatus(status: AiStatus) {
        const element = $("#aiStatus");
        if (!element) return;
        const ready = status.connected === true;
        const unavailable = status.configured === false || status.connected === false;
        // 仅未知状态使用检查样式；明确失败优先于 checking 标记。
        const checking = !ready && !unavailable;
        element.classList.toggle("disconnected", unavailable);
        element.classList.toggle("checking", checking);
        let label = "暂未确认连接状态";
        if (ready) label = "印小灵已经准备好啦";
        else if (status.configured === false) label = "印小灵暂时打了个小盹";
        else if (unavailable) label = "连接失败，请稍后重试";
        element.innerHTML = `<i></i> ${label}`;
      }

      // 集中绑定发送、快捷提问、上传和清空事件，页面初始化时调用一次。
      function init() {
        window.addEventListener("ai-status-change", function handleAiStatusChange(event) {
          return renderStatus(event.detail || { connected: false });
        });
        ($("#chatForm") as HTMLFormElement)?.addEventListener("submit", function handleSubmit(event) {
          event.preventDefault();
          send(($("#aiQuestion") as HTMLInputElement).value.trim());
        });
        ($$(`[data-prompt]`) as HTMLElement[]).forEach((button) =>
          button.addEventListener("click", function handleClick() {
            return send(button.dataset.prompt);
          }),
        );
        ($("#aiImage") as HTMLInputElement)?.addEventListener("change", function handleChange() {
          const files = [...($("#aiImage") as HTMLInputElement).files];
          const availableSlots = Math.max(0, 4 - selectedImages.length);
          const validFiles = files
            .filter((file) => {
              if (file.size > 5 * 1024 * 1024) {
                showToast(`${file.name} 太大啦，请换一张不超过 5MB 的图片`);
                return false;
              }
              return true;
            })
            .slice(0, availableSlots);
          if (files.length > availableSlots) showToast("印小灵一次最多能抱住 4 张图片哦");
          validFiles.forEach((file) =>
            selectedImages.push({
              id: `${Date.now()}-${Math.random()}`,
              file,
              previewUrl: URL.createObjectURL(file),
            }),
          );
          ($("#aiImage") as HTMLInputElement).value = "";
          renderSelectedImages();
        });
        $("#uploadThumbnails")?.addEventListener("click", function handleClick(event) {
          const button = ((event.target as HTMLElement).closest("[data-remove-image]") as HTMLElement);
          if (!button) return;
          const index = selectedImages.findIndex((item) => item.id === button.dataset.removeImage);
          if (index < 0) return;
          URL.revokeObjectURL(selectedImages[index].previewUrl);
          selectedImages.splice(index, 1);
          renderSelectedImages();
        });
        ($("#clearImages") as HTMLButtonElement)?.addEventListener("click", clearSelectedImages);
        ($("#clearChat") as HTMLButtonElement)?.addEventListener("click", function handleClick() {
          $("#chatMessages").innerHTML =
            '<div class="chat-message assistant">小黑板擦干净啦！重新开始吧，想聊封泥或别的小问题都可以。</div>';
          sessionId = "";
          window.sessionStorage.removeItem(sessionStorageKey);
          clearSelectedImages();
        });
      }

      return { init, renderStatus };
    },
  };
})();

window.NiyunAiChat = NiyunAiChat;
