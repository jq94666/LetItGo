<script setup>
/* 淡雅 iPad 壁纸：浅底 + 低饱和色晕 + 毛玻璃 + 几何图形（同心圆／圆角方／弧线／斜线／点阵） */
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <!-- 浅色基底：淡紫灰，避免纯白发亮 -->
    <div class="absolute inset-0 bg-linear-to-br from-[#e9ecf5] via-[#f1eff7] to-[#f8f1f3]" />

    <!-- 低饱和色晕：iPad 配色，透明度压低，柔和铺开 -->
    <div
      class="absolute -left-[20%] -top-[24%] h-[82vw] w-[82vw]"
      style="background-image: radial-gradient(closest-side, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1) 55%, transparent 100%)"
    />
    <div
      class="absolute -right-[18%] -top-[14%] h-[70vw] w-[70vw]"
      style="background-image: radial-gradient(closest-side, rgba(139, 92, 246, 0.28), rgba(139, 92, 246, 0.09) 55%, transparent 100%)"
    />
    <div
      class="absolute left-[16%] top-[26%] h-[64vw] w-[64vw]"
      style="background-image: radial-gradient(closest-side, rgba(217, 70, 239, 0.2), rgba(217, 70, 239, 0.07) 55%, transparent 100%)"
    />
    <div
      class="absolute -left-[14%] -bottom-[18%] h-[66vw] w-[66vw]"
      style="background-image: radial-gradient(closest-side, rgba(34, 211, 238, 0.24), rgba(34, 211, 238, 0.08) 55%, transparent 100%)"
    />
    <div
      class="absolute -right-[16%] -bottom-[22%] h-[76vw] w-[76vw]"
      style="background-image: radial-gradient(closest-side, rgba(244, 63, 94, 0.2), rgba(244, 63, 94, 0.07) 55%, transparent 100%)"
    />
    <div
      class="absolute left-[36%] top-[6%] h-[38vw] w-[38vw]"
      style="background-image: radial-gradient(closest-side, rgba(251, 191, 36, 0.22), rgba(251, 191, 36, 0.07) 55%, transparent 100%)"
    />

    <!-- 毛玻璃层：柔化成雾面 -->
    <div class="absolute inset-0 bg-white/25 backdrop-blur-[40px]" />

    <!-- 几何图形：细线描边，叠在雾面之上保持清晰 -->
    <svg
      class="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      aria-hidden="true"
    >
      <!-- 右上：双层同心圆 -->
      <circle cx="1010" cy="90" r="215" stroke="rgba(99,102,241,0.26)" stroke-width="1.5" />
      <circle cx="1010" cy="90" r="296" stroke="rgba(99,102,241,0.14)" stroke-width="1.5" />

      <!-- 左下：三层同心圆 -->
      <circle cx="130" cy="720" r="58" stroke="rgba(236,72,153,0.28)" stroke-width="1.5" />
      <circle cx="130" cy="720" r="112" stroke="rgba(236,72,153,0.18)" stroke-width="1.5" />
      <circle cx="130" cy="720" r="172" stroke="rgba(236,72,153,0.1)" stroke-width="1.5" />

      <!-- 右下：嵌套圆角方 -->
      <g transform="rotate(-14 980 620)">
        <rect x="850" y="490" width="260" height="260" rx="74" stroke="rgba(56,189,248,0.3)" stroke-width="1.5" />
        <rect x="910" y="550" width="140" height="140" rx="42" stroke="rgba(56,189,248,0.18)" stroke-width="1.5" />
      </g>

      <!-- 中央：大弧线 -->
      <path d="M 300 810 A 340 340 0 0 1 980 810" stroke="rgba(139,92,246,0.2)" stroke-width="1.5" />
      <path d="M 380 810 A 260 260 0 0 1 900 810" stroke="rgba(139,92,246,0.12)" stroke-width="1.5" />

      <!-- 斜线组 -->
      <g stroke="rgba(99,102,241,0.12)" stroke-width="1">
        <line x1="-60" y1="880" x2="760" y2="-40" />
        <line x1="60" y1="900" x2="880" y2="-20" />
        <line x1="180" y1="920" x2="1000" y2="0" />
      </g>

      <!-- 圆角方点缀 -->
      <rect x="470" y="96" width="86" height="86" rx="26" stroke="rgba(244,63,94,0.26)" stroke-width="1.5" transform="rotate(18 513 139)" />
      <rect x="640" y="640" width="64" height="64" rx="20" stroke="rgba(251,191,36,0.34)" stroke-width="1.5" transform="rotate(-12 672 672)" />

      <!-- 实心小圆点 -->
      <circle cx="600" cy="200" r="7" fill="rgba(244,63,94,0.32)" />
      <circle cx="760" cy="330" r="5" fill="rgba(139,92,246,0.3)" />
      <circle cx="300" cy="470" r="6" fill="rgba(56,189,248,0.34)" />
      <circle cx="1090" cy="470" r="5" fill="rgba(251,191,36,0.4)" />
      <circle cx="860" cy="200" r="4" fill="rgba(99,102,241,0.3)" />
      <circle cx="240" cy="250" r="4" fill="rgba(236,72,153,0.3)" />
    </svg>

    <!-- 胶片颗粒：增加真实质感 -->
    <div class="wp-grain absolute inset-0" />

    <!-- 极淡暗角：轻微收边，保持通透 -->
    <div
      class="absolute inset-0"
      style="background-image: radial-gradient(120% 110% at 50% 42%, transparent 45%, rgba(58, 64, 92, 0.1) 100%)"
    />

    <!-- 底部渐隐：保证底部按钮区清晰 -->
    <div class="absolute inset-x-0 bottom-0 h-[26%] bg-linear-to-t from-white/70 to-transparent" />
  </div>
</template>

<style scoped>
.wp-grain {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.1;
  mix-blend-mode: overlay;
}
</style>
