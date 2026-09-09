(function () {
  "use strict";

  window.NiyunSourceArchive = {
    create(dependencies) {
      // 地图、藏品卡和搜索结果都会打开同一个图录弹窗，因此集中在这里维护打开、关闭和定位逻辑。
      const {
        $,
        sourceDialog,
        sourceDialogPanel,
        sourceDialogSearch,
        clearSourceDialogSearch,
        renderSourceDialogIndex,
        cacheSourceSupplementHeights,
        animateSourceSupplementDetails,
        getRelicArchiveLink,
        prefersReducedMotion,
        openModalAnimation,
        closeModalAnimation,
        showToast,
        getVisibleSites,
        navigateToMapIndex,
      } = dependencies;

      // 所有图录入口共用这个流程：筛选内容、打开窗口，再聚焦搜索框。
      function openArchive(query = "") {
        renderSourceDialogIndex(query);
        sourceDialogSearch.value = query;
        sourceDialog.classList.remove("is-closing");
        sourceDialog.showModal();
        openModalAnimation(sourceDialogPanel);
        sourceDialogSearch.focus();
      }

      async function close() {
        if (!sourceDialog?.open || sourceDialog.classList.contains("is-closing")) return;
        sourceDialog.classList.add("is-closing");
        const animation = closeModalAnimation(sourceDialogPanel);
        if (animation) {
          try {
            await animation.finished;
          } catch (_) {
            return;
          }
        }
        sourceDialog.classList.remove("is-closing");
        sourceDialog.close();
      }

      // 等弹窗排版完成后定位卡片，否则滚动位置可能算不准。
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
        openArchive(county);
        focusCard(site.id, `已定位图录：${site.city} · ${site.seals[0]}`);
      }

      function openRelic(relicId) {
        const link = getRelicArchiveLink(relicId) || {};
        openArchive(link.query || "");
        if (link.siteId) {
          focusCard(link.siteId);
        } else {
          window.setTimeout(() => {
            const message = link.query ? `完整图录中暂未找到“${link.query}”同名条目` : "完整图录已打开";
            showToast(message);
            sourceDialogSearch.focus();
          }, 80);
        }
      }

      function navigateToMap(event) {
        const link = event.target.closest("[data-source-site]");
        if (!link) return;
        event.preventDefault();
        navigateToMapIndex(link.dataset.sourceSite);
        close();
      }

      function init() {
        $("#sourceIndex")?.addEventListener("click", navigateToMap);
        $("#sourceDialogIndex")?.addEventListener("click", navigateToMap);
        const handleDetails = function handleDetails(event) {
          const summary = event.target.closest(".source-card-supplement-details > summary");
          if (!summary) return;
          event.preventDefault();
          animateSourceSupplementDetails(summary.parentElement, !summary.parentElement.open);
        };
        $("#sourceIndex")?.addEventListener("click", handleDetails);
        $("#sourceDialogIndex")?.addEventListener("click", handleDetails);
        $("#openSourceIndex")?.addEventListener("click", function handleClick() {
          return openArchive();
        });
        $("#closeSourceIndex")?.addEventListener("click", close);
        sourceDialog?.addEventListener("click", function handleClick(event) {
          if (event.target === sourceDialog) close();
        });
        sourceDialog?.addEventListener("cancel", function handleCancel(event) {
          event.preventDefault();
          close();
        });
        sourceDialogSearch?.addEventListener("input", function handleInput(event) {
          return renderSourceDialogIndex(event.target.value);
        });
        clearSourceDialogSearch?.addEventListener("click", function handleClick() {
          sourceDialogSearch.value = "";
          renderSourceDialogIndex();
        });
        window.addEventListener("resize", function handleResize() {
          cacheSourceSupplementHeights($("#sourceIndex"));
          cacheSourceSupplementHeights($("#sourceDialogIndex"));
        });
      }

      return { init, close, openSite, openRelic };
    },
  };
})();
