(function () {
  "use strict";

  window.NiyunDisplaySettings = {
    create(dependencies) {
      // 设置模块不直接持有 userSettings，而是通过回调读写，避免恢复默认后出现旧状态。
      const { $, getSettings, updateSetting, resetSettings, defaults, ranges, openingKey, reducedMotion, applySettings, showToast, dispatchReset } = dependencies;
      const dialog = $("#settingsDialog");
      const form = $("#settingsForm");
      const openButton = $("#openSettings");
      const outputs = { motionIntensity: $("#motionValue"), tiltDegrees: $("#tiltValue"), dustQuantity: $("#dustValue"), dustSpeed: $("#dustSpeedValue") };

      const describe = {
        motionIntensity: (value) => value === 0 ? "0%，关闭空间位移" : `${value}%，${value <= 30 ? "轻微" : value <= 70 ? "标准" : "明显"}动效`,
        tiltDegrees: (value) => value === 0 ? "0 度，关闭卡片倾斜" : `${value} 度，${value <= 2 ? "轻微" : value <= 4 ? "标准" : "明显"}立体效果`,
        dustQuantity: (value) => value === 0 ? "0 粒，关闭背景微尘" : `${value} 粒，${value <= 8 ? "少量" : value <= 20 ? "适量" : "较多"}微尘`,
        dustSpeed: (value) => value === 0 ? "0%，微尘静止" : `${value}%，${value <= 70 ? "缓慢漂移" : value <= 130 ? "标准速度" : "快速漂移"}`
      };

      function sync() {
        if (!form) return;
        const settings = getSettings();
        form.querySelectorAll(`[name="themeMode"]`).forEach((input) => { input.checked = input.value === settings.themeMode; });
        form.querySelectorAll(`[name="fontSize"]`).forEach((input) => { input.checked = input.value === settings.fontSize; });
        form.querySelectorAll(`[name="lineHeight"]`).forEach((input) => { input.checked = input.value === settings.lineHeight; });
        const openingInput = $("#openingAnimationEnabled");
        if (openingInput) openingInput.checked = localStorage.getItem(openingKey) !== "false";
        const rangesMap = { motionIntensity: ranges.pageMotion, tiltDegrees: ranges.cardTilt, dustQuantity: ranges.backgroundDust, dustSpeed: ranges.backgroundDustSpeed };
        Object.entries(rangesMap).forEach(([name, range]) => {
          const input = form.elements[name];
          if (!input) return;
          Object.assign(input, { min: range.min, max: range.max, step: range.step, value: settings[name] });
          input.setAttribute("aria-valuetext", describe[name](settings[name]));
        });
        outputs.motionIntensity.value = `${settings.motionIntensity}${ranges.pageMotion.unit}`;
        outputs.tiltDegrees.value = `${settings.tiltDegrees}${ranges.cardTilt.unit}`;
        outputs.dustQuantity.value = `${settings.dustQuantity} ${ranges.backgroundDust.unit}`;
        outputs.dustSpeed.value = `${settings.dustSpeed}${ranges.backgroundDustSpeed.unit}`;
        const systemNote = $("#systemMotionNote");
        if (systemNote) systemNote.hidden = !reducedMotion;
      }

      function animate(open) {
        const panel = dialog?.querySelector(".settings-panel");
        if (!panel) return null;
        panel.getAnimations().forEach((item) => item.cancel());
        return panel.animate(open
          ? [{ clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0)" }]
          : [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 0 100%)" }],
        { duration: reducedMotion ? 1 : 300, easing: "cubic-bezier(.65,0,.35,1)", fill: "both" });
      }

      async function close() {
        if (!dialog?.open || dialog.classList.contains("is-closing")) return;
        dialog.classList.add("is-closing");
        const animation = animate(false);
        if (animation) { try { await animation.finished; } catch (_) { return; } }
        dialog.classList.remove("is-closing");
        dialog.close();
      }

      function init() {
        openButton?.addEventListener("click", () => { sync(); dialog.showModal(); animate(true); openButton.setAttribute("aria-expanded", "true"); $("#closeSettings")?.focus(); });
        $("#closeSettings")?.addEventListener("click", close);
        $("#doneSettings")?.addEventListener("click", close);
        dialog?.addEventListener("click", (event) => { if (event.target === dialog) close(); });
        dialog?.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
        dialog?.addEventListener("close", () => { openButton?.setAttribute("aria-expanded", "false"); openButton?.focus(); });
        form?.addEventListener("input", (event) => {
          const input = event.target;
          if (input.id === "openingAnimationEnabled") { localStorage.setItem(openingKey, String(input.checked)); return; }
          if (!input.name) return;
          updateSetting(input.name, input.type === "range" ? Number(input.value) : input.value);
          applySettings();
          sync();
        });
        $("#resetSettings")?.addEventListener("click", () => {
          resetSettings();
          applySettings();
          localStorage.setItem(openingKey, "true");
          dispatchReset();
          sync();
          showToast("显示设置已恢复默认");
        });
        sync();
      }
      return { init, sync };
    }
  };
}());
