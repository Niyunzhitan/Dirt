<script setup>
defineProps({
  completed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  score: { type: Number, default: 0 }
});
</script>

<template>
  <div class="quiz-toolbar">
    <div><strong aria-label="答题进度">{{ completed }} / {{ total }}</strong></div>
    <div class="quiz-progress" aria-hidden="true">
      <i :style="{ transform: `scaleX(${total ? completed / total : 0})` }"></i>
    </div>
    <div class="quiz-score" aria-label="当前得分" aria-live="polite">
      <strong>{{ score }}</strong><small>分</small>
    </div>
  </div>
</template>
