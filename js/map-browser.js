(function () {
  "use strict";
  window.NiyunMapBrowser = {
    create({ $, $$, apiService, getVisibleSites, renderSites, updateSitePanel, openCurrentSiteArchive }) {
      // 地图点位由 app.js 渲染；本模块只负责筛选、选中状态和把操作转给图录模块。
      let filterRequest = 0;

      async function filterSites(period) {
        const requestId = ++filterRequest;
        const root = $("#shandongMap");
        root?.setAttribute("aria-busy", "true");
        try {
          const sites = await apiService.getSites(period);
          // 快速连点时只展示最后一次筛选，避免旧结果覆盖新结果。
          if (requestId !== filterRequest) return;
          $$("[data-period]").forEach((button) => {
            button.classList.toggle("active", button.dataset.period === period);
          });
          renderSites(sites);
        } catch (error) {
          if (requestId === filterRequest) {
            const status = $("#mapTerrainStatus");
            if (status) status.textContent = error.message || "地图资料加载失败，请重试";
          }
        } finally {
          if (requestId === filterRequest) root?.setAttribute("aria-busy", "false");
        }
      }

      function setMapMode(mode) {
        const root = $("#shandongMap");
        if (!root || !mode) return;
        root.dataset.mapMode = mode;
        $$("[data-map-mode]").forEach((button) => {
          const active = button.dataset.mapMode === mode;
          button.classList.toggle("active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        window.dispatchEvent(new CustomEvent("shandong-map-mode-change", { detail: { mode } }));
      }

      function init() {
        $$("[data-period]").forEach((button) => {
          button.addEventListener("click", () => filterSites(button.dataset.period));
        });
        $$("[data-map-mode]").forEach((button) => {
          button.addEventListener("click", () => setMapMode(button.dataset.mapMode));
        });
        $("#mapMarkers")?.addEventListener("click", (event) => {
          const marker = event.target.closest(".map-marker");
          if (!marker) return;
          $$(".map-marker", event.currentTarget).forEach((item) => item.classList.toggle("active", item === marker));
          const sites = getVisibleSites();
          const index = sites.findIndex((site) => site.id === Number(marker.dataset.siteId));
          if (index >= 0) updateSitePanel(sites[index], index);
        });
        $("#openCurrentSiteArchive")?.addEventListener("click", () => {
          const id = Number($("#mapMarkers .map-marker.active")?.dataset.siteId);
          if (!id) return;
          openCurrentSiteArchive(id);
        });
      }
      return { init };
    }
  };
}());
