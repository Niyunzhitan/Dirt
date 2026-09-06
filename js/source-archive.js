(function () {
  "use strict";

  window.NiyunSourceArchive = {
    create(dependencies) {
      const { $, sourceDialog, sourceDialogPanel, sourceDialogSearch, clearSourceDialogSearch,
        renderSourceDialogIndex, cacheSourceSupplementHeights,
        animateSourceSupplementDetails, getRelicArchiveLink,
        prefersReducedMotion, openModalAnimation, closeModalAnimation, showToast,
        getVisibleSites, navigateToMapIndex, setMenuOpen } = dependencies;

      async function close() {
        if (!sourceDialog?.open || sourceDialog.classList.contains("is-closing")) return;
        sourceDialog.classList.add("is-closing");
        const animation = closeModalAnimation(sourceDialogPanel);
        if (animation) {
          try { await animation.finished; } catch (_) { return; }
        }
        sourceDialog.classList.remove("is-closing");
        sourceDialog.close();
      }

      function focusCard(siteId, message) {
        window.setTimeout(() => {
          const target = $(`#sourceDialogIndex [data-source-card="${siteId}"]`);
          target?.classList.add("search-target");
          target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
          if (message) showToast(message);
          sourceDialogSearch?.focus();
        }, 80);
      }

      function openSite(siteId) {
        const site = getVisibleSites().find((item) => Number(item.id) === Number(siteId));
        if (!site) return;
        const county = String(site.city || "").split(" · ")[1] || String(site.city || "");
        renderSourceDialogIndex(county);
        sourceDialog.classList.remove("is-closing");
        sourceDialog.showModal();
        openModalAnimation(sourceDialogPanel);
        sourceDialogSearch.value = county;
        focusCard(site.id, `已定位图录：${site.city} · ${site.seals[0]}`);
      }

      function openRelic(relicId) {
        const link = getRelicArchiveLink(relicId) || {};
        renderSourceDialogIndex(link.query || "");
        sourceDialog.classList.remove("is-closing");
        sourceDialog.showModal();
        openModalAnimation(sourceDialogPanel);
        sourceDialogSearch.value = link.query || "";
        if (link.siteId) focusCard(link.siteId);
        else window.setTimeout(() => { showToast(link.query ? `完整图录中暂未找到“${link.query}”同名条目` : "完整图录已打开"); sourceDialogSearch.focus(); }, 80);
      }

      function navigateToMap(event) {
        const link = event.target.closest("[data-source-site]");
        if (!link) return;
        event.preventDefault();
        navigateToMapIndex(link.dataset.sourceSite);
        const marker = $(`[data-site-id="${link.dataset.sourceSite}"]`);
        close();
        if (!marker) return;
      }

      function init() {
        $("#sourceIndex")?.addEventListener("click", navigateToMap);
        $("#sourceDialogIndex")?.addEventListener("click", navigateToMap);
        const handleDetails = (event) => {
          const summary = event.target.closest(".source-card-supplement-details > summary");
          if (!summary) return;
          event.preventDefault();
          animateSourceSupplementDetails(summary.parentElement, !summary.parentElement.open);
        };
        $("#sourceIndex")?.addEventListener("click", handleDetails);
        $("#sourceDialogIndex")?.addEventListener("click", handleDetails);
        $("#openSourceIndex")?.addEventListener("click", () => { renderSourceDialogIndex(); sourceDialog.showModal(); openModalAnimation(sourceDialogPanel); sourceDialogSearch.focus(); });
        $("#closeSourceIndex")?.addEventListener("click", close);
        sourceDialog?.addEventListener("click", (event) => { if (event.target === sourceDialog) close(); });
        sourceDialog?.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
        sourceDialogSearch?.addEventListener("input", (event) => renderSourceDialogIndex(event.target.value));
        clearSourceDialogSearch?.addEventListener("click", () => { sourceDialogSearch.value = ""; renderSourceDialogIndex(); });
        window.addEventListener("resize", () => { cacheSourceSupplementHeights($("#sourceIndex")); cacheSourceSupplementHeights($("#sourceDialogIndex")); });
      }

      return { init, close, openSite, openRelic };
    }
  };
}());
