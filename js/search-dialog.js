(function () {
  "use strict";

  window.NiyunSearchDialog = {
    create(dependencies) {
      const {
        $, escapeHtml, prefersReducedMotion, renderSourceDialogIndex,
        sourceDialog, sourceDialogPanel, openModalAnimation, closeModalAnimation,
        findKnowledgeSites, revealTarget, showToast, apiService
      } = dependencies;
      const dialog = $("#searchDialog");
      const input = $("#searchInput");
      const results = $("#searchResults");
      const clearButton = $("#clearSearch");
      const initialMessage = "<p>输入关键词以检索封泥藏品、古地名与调研档案。</p>";

      function updateClearButton() {
        const hasValue = Boolean(input?.value.trim());
        if (clearButton) clearButton.hidden = !hasValue;
      }

      function openAnimation() {
        const panel = dialog?.querySelector(".search-panel");
        if (!panel) return;
        panel.getAnimations().forEach((animation) => animation.cancel());
        panel.animate([
          { opacity: 0, transform: "translateY(10px) scale(.98)" },
          { opacity: 1, transform: "translateY(0) scale(1)" }
        ], { duration: prefersReducedMotion() ? 1 : 280, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
      }

      function closeAnimation() {
        const panel = dialog?.querySelector(".search-panel");
        if (!panel || prefersReducedMotion()) return null;
        return panel.animate([
          { opacity: 1, transform: "translateY(0) scale(1)" },
          { opacity: 0, transform: "translateY(8px) scale(.98)" }
        ], { duration: 180, easing: "ease-in", fill: "both" });
      }

      async function close() {
        if (!dialog?.open || dialog.classList.contains("is-closing")) return;
        dialog.classList.add("is-closing");
        const animation = closeAnimation();
        if (animation) {
          try { await animation.finished; } catch (_) { return; }
        }
        dialog.classList.remove("is-closing");
        dialog.close();
      }

      async function search() {
        if (!input || !results) return;
        const keyword = input.value.trim();
        if (!keyword) {
          results.innerHTML = initialMessage;
          input.focus();
          return;
        }
        results.innerHTML = "<p>正在检索封泥档案……</p>";
        const response = await apiService.getRelics({ keyword });
        const query = keyword.toLowerCase();
        const sourceMatches = findKnowledgeSites(query);
        const total = response.total + sourceMatches.length;
        const relicGroup = response.items.length
          ? `<div class="search-result-group"><h3>代表藏品 <span>${response.total}</span></h3>${response.items.map((item) => `<button type="button" data-search-id="${item.id}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.period)} · ${escapeHtml(item.location)}</span></button>`).join("")}</div>`
          : "";
        const sourceGroup = sourceMatches.length
          ? `<div class="search-result-group"><h3>45区县金石图录 <span>${sourceMatches.length}</span></h3>${sourceMatches.map((site) => {
              const matchedSeals = site.seals.filter((seal) => seal.toLowerCase().includes(query));
              const detail = matchedSeals.length ? matchedSeals.slice(0, 2).join(" · ") : `${site.period} · ${site.admin}`;
              return `<button type="button" data-search-site-id="${site.id}"><strong>${escapeHtml(site.city)} · ${escapeHtml(site.name)}</strong><span>${escapeHtml(detail)}</span></button>`;
            }).join("")}</div>`
          : "";
        results.innerHTML = total
          ? `<p class="search-count">共找到 ${total} 条相关档案，点击即可前往对应位置。</p>${relicGroup}${sourceGroup}`
          : `<p>没有找到“${escapeHtml(keyword)}”，可以尝试“临淄”“守印”或“仓府”。</p>`;
      }

      function open() {
        if (!dialog) return;
        dialog.classList.remove("is-closing");
        dialog.showModal();
        openAnimation();
        updateClearButton();
        input?.focus();
      }

      function init() {
        $("#openSearch")?.addEventListener("click", open);
        $("#closeSearch")?.addEventListener("click", close);
        dialog?.addEventListener("click", (event) => { if (event.target === dialog) close(); });
        dialog?.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
        dialog?.addEventListener("keydown", (event) => {
          if (event.key === "Escape") { event.preventDefault(); close(); }
        });
        dialog?.addEventListener("close", () => $("#openSearch")?.focus());
        input?.addEventListener("input", updateClearButton);
        $("#clearSearch")?.addEventListener("click", () => {
          input.value = "";
          results.innerHTML = initialMessage;
          updateClearButton();
          input.focus();
        });
        $("#searchForm")?.addEventListener("submit", (event) => { event.preventDefault(); search(); });
        results?.addEventListener("click", async (event) => {
          const resultButton = event.target.closest("[data-search-id], [data-search-site-id]");
          if (!resultButton) return;
          if (resultButton.dataset.searchId) {
            const relic = await apiService.getRelicById(resultButton.dataset.searchId);
            close();
            window.setTimeout(() => {
              const target = $(`[data-relic-card="${resultButton.dataset.searchId}"]`);
              if (!target) return $("#collection")?.scrollIntoView();
              revealTarget(target);
              if (relic) showToast(`已定位：${relic.name} · ${relic.location}`);
            }, 80);
            return;
          }
          const site = findKnowledgeSites("").find((item) => item.id === Number(resultButton.dataset.searchSiteId));
          if (!site) return;
          close();
          renderSourceDialogIndex(site.city);
          sourceDialog.classList.remove("is-closing");
          sourceDialog.showModal();
          openModalAnimation(sourceDialogPanel);
          window.setTimeout(() => {
            const targetCard = $(`#sourceDialogIndex [data-source-card="${site.id}"]`);
            targetCard?.classList.add("search-target");
            targetCard?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
            showToast(`已定位图录：${site.city} · ${site.seals[0]}`);
          }, 80);
        });
      }

      return { init };
    }
  };
}());
