(function () {
  "use strict";
  window.NiyunMapBrowser = {
    create({ $, $$, apiService, getVisibleSites, renderSites, updateSitePanel, openCurrentSiteArchive }) {
      function init() {
        const filter = async (period = "全部") => { $$(".filter-chip").forEach((button) => button.classList.toggle("active", button.dataset.period === period)); renderSites(await apiService.getSites(period)); };
        $$(".filter-chip").forEach((button) => button.addEventListener("click", () => filter(button.dataset.period)));
        const modeButtons = $$(`[data-map-mode]`);
        modeButtons.forEach((button) => button.addEventListener("click", () => {
          const mode = button.dataset.mapMode; const root = $("#shandongMap"); if (!root || !mode) return;
          root.dataset.mapMode = mode; modeButtons.forEach((item) => { const active = item.dataset.mapMode === mode; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
          window.dispatchEvent(new CustomEvent("shandong-map-mode-change", { detail: { mode } }));
        }));
        $("#mapMarkers")?.addEventListener("click", (event) => {
          const marker = event.target.closest(".map-marker"); if (!marker) return;
          $$(".map-marker", event.currentTarget).forEach((item) => item.classList.toggle("active", item === marker));
          const sites = getVisibleSites(); const index = sites.findIndex((site) => site.id === Number(marker.dataset.siteId));
          if (index >= 0) updateSitePanel(sites[index], index);
        });
        $("#openCurrentSiteArchive")?.addEventListener("click", () => {
          const id = Number($("#mapMarkers .map-marker.active")?.dataset.siteId); if (!id) return;
          openCurrentSiteArchive(id);
        });
      }
      return { init };
    }
  };
}());
