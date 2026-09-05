<script setup>
defineProps({
  title: { type: String, required: true },
  score: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  total: { type: Number, required: true }
});

defineEmits(["share", "restart"]);
</script>

<template>
  <div class="quiz-result">
    <span>本轮称号</span><h3>{{ title }}</h3><strong>{{ score }}<small>分</small></strong>
    <p>共答对 {{ correctCount }} / {{ total }} 题。每一次辨认，都是走近齐鲁金石的一步。</p>
    <button class="button quiz-share-button" type="button" @click="$emit('share')">分享成绩 <span aria-hidden="true">↗</span></button>
    <button class="button primary" type="button" @click="$emit('restart')">再来一轮 <span aria-hidden="true">↻</span></button>
  </div>
</template>
