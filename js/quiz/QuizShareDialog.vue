<script setup>
import { nextTick, ref } from "vue";

const props = defineProps({ title: { type: String, required: true }, score: { type: Number, required: true }, total: { type: Number, required: true } });
const dialog = ref(null);
const copyButton = ref(null);
const copied = ref(false);
const copyButtonText = ref("复制当前网址");
const copyFeedback = ref("分享网址后，朋友可以打开同一个趣味问答页面。");
const shareUrl = window.location.href;
const copyCount = ref(0);
let copyResetTimer = null;

function open() {
  copied.value = false;
  copyButtonText.value = copyCount.value ? "再次复制" : "复制当前网址";
  copyFeedback.value = "分享网址后，朋友可以打开同一个趣味问答页面。";
  dialog.value?.showModal();
  nextTick(() => copyButton.value?.focus());
}

function close() { dialog.value?.close(); }

async function copyUrl() {
  copied.value = false;
  copyButtonText.value = "复制中…";
  copyFeedback.value = "正在复制当前网址……";

  const copyWithTextarea = () => {
    const input = document.createElement("textarea");
    input.value = shareUrl;
    input.readOnly = true;
    input.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(input);
    input.focus();
    input.select();
    input.setSelectionRange(0, input.value.length);
    const copiedByCommand = document.execCommand("copy");
    input.remove();
    if (!copiedByCommand) throw new Error("浏览器拒绝复制");
  };

  try {
    let copiedByClipboard = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copiedByClipboard = true;
      } catch (_) {
        copiedByClipboard = false;
      }
    }
    if (!copiedByClipboard) copyWithTextarea();

    copyCount.value += 1;
    copied.value = true;
    copyButtonText.value = copyCount.value > 1 ? "再次复制成功" : "已复制";
    copyFeedback.value = copyCount.value > 1
      ? `已第 ${copyCount.value} 次复制当前网址。`
      : "网址已复制，可以发送给朋友了。";
    window.clearTimeout(copyResetTimer);
    copyResetTimer = window.setTimeout(() => {
      copied.value = false;
      copyButtonText.value = "再次复制";
      copyFeedback.value = "可继续点击，再次复制当前网址。";
    }, 1600);
  } catch (_) {
    copyButtonText.value = "复制失败";
    copyFeedback.value = "复制失败，请手动复制当前网页地址。";
  }
}

defineExpose({ open });
</script>

<template>
  <teleport to="body">
    <dialog ref="dialog" class="share-dialog" aria-labelledby="shareTitle" @click.self="close" @cancel.prevent="close">
      <div class="share-panel">
        <button class="share-close" type="button" aria-label="关闭成绩分享弹窗" @click="close">×</button>
        <p class="eyebrow">趣味问答成绩</p><div class="share-rank" aria-hidden="true"><span>段</span></div>
        <p class="share-kicker">本轮段位</p><h2 id="shareTitle">{{ props.title }}</h2>
        <p class="share-summary">本轮得分 {{ props.score }} 分，答题完成。</p>
        <div class="share-url-row"><span class="share-url">{{ shareUrl }}</span><button ref="copyButton" class="share-copy" :class="{ 'is-copied': copied }" type="button" @click="copyUrl">{{ copyButtonText }}</button></div>
        <p class="share-feedback" role="status" aria-live="polite">{{ copyFeedback }}</p>
      </div>
    </dialog>
  </teleport>
</template>
