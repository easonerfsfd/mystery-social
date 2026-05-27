<template>
  <div class="stage">
    <div class="phone">
      <!-- Status bar -->
      <div class="statusbar">
        <span>9:41</span>
        <div class="icons">
          <i class="ti ti-wifi"></i>
          <i class="ti ti-battery-2"></i>
        </div>
      </div>

      <!-- Screen -->
      <div class="screen">
        <TabQuestion v-show="tab === 'q'" />
        <TabDiscover v-show="tab === 'd'" />
        <TabProfile  v-show="tab === 'm'" />
      </div>

      <!-- Tab bar -->
      <div class="tabbar">
        <button class="tab-btn" :class="{ 'active-q': tab === 'q' }" @click="tab = 'q'">
          <i class="ti ti-help"></i>
          <span>问题</span>
        </button>
        <button class="tab-btn" :class="{ 'active-d': tab === 'd' }" @click="switchToDiscover">
          <i class="ti ti-compass"></i>
          <span>发现</span>
        </button>
        <button class="tab-btn" :class="{ 'active-m': tab === 'm' }" @click="switchToProfile">
          <i class="ti ti-user"></i>
          <span>我的</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { useFeedStore } from '@/stores/feed.js'
import TabQuestion from '@/views/TabQuestion.vue'
import TabDiscover from '@/views/TabDiscover.vue'
import TabProfile  from '@/views/TabProfile.vue'

const tab = ref('q')
const userStore = useUserStore()
const feedStore = useFeedStore()

function setAppHeight() {
  document.documentElement.style.setProperty('--app-h', `${window.innerHeight}px`)
}

onMounted(() => {
  setAppHeight()
  window.addEventListener('resize', setAppHeight)
  userStore.fetchMe()
})

function switchToDiscover() {
  tab.value = 'd'
  feedStore.fetchFeed(true)
}

function switchToProfile() {
  tab.value = 'm'
  userStore.fetchMe()
}
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
input, textarea, select { font-size: 16px; }

:root {
  --bg: #0d0d0d;
  --card: #141414;
  --border: #1e1e1e;
  --border2: #2a2a2a;
  --muted: #444;
  --muted2: #555;
  --text: #fff;
  --text2: #aaa;
  --q: #7F77DD;
  --q-bg: #1e1d38;
  --d: #639922;
  --d-bg: #142a14;
  --m: #D4537E;
  --font-serif: 'Noto Serif SC', serif;
  --font-sans: 'Noto Sans SC', sans-serif;
}

body {
  background: #1a1a2e;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-family: var(--font-sans);
}

.stage { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }

.phone {
  width: 340px;
  background: var(--bg);
  border-radius: 36px;
  overflow: hidden;
  border: 0.5px solid #2a2a2a;
  box-shadow: 0 0 0 8px #111, 0 0 0 9px #222, 0 40px 80px rgba(0,0,0,.8);
  display: flex;
  flex-direction: column;
}

.statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px 6px;
  background: var(--bg);
  flex-shrink: 0;
}
.statusbar span { font-size: 12px; color: var(--muted); font-weight: 500; }
.statusbar .icons { display: flex; gap: 5px; align-items: center; }
.statusbar i { font-size: 13px; color: var(--muted); }

.screen { height: 568px; overflow: hidden; position: relative; background: var(--bg); }

.tabbar {
  display: flex;
  background: var(--bg);
  border-top: 0.5px solid #1a1a1a;
  padding: 10px 0 18px;
  flex-shrink: 0;
}

/* 真机全屏 */
@media (max-width: 480px) {
  body {
    background: var(--bg);
    overflow: hidden;
    display: block;
    min-height: 0;
    height: var(--app-h, 100svh);
  }
  .stage {
    padding: 0;
    width: 100%;
    height: var(--app-h, 100svh);
    display: flex;
    align-items: stretch;
  }
  .phone {
    width: 100%;
    height: var(--app-h, 100svh);
    border-radius: 0;
    border: none;
    box-shadow: none;
    overflow: hidden;
  }
  .statusbar { display: none; }
  .screen { flex: 1; min-height: 0; overflow: hidden; position: relative; }
  .screen > * { position: absolute; inset: 0; }
  .tabbar { flex-shrink: 0; padding: 10px 0 env(safe-area-inset-bottom, 12px); }
}
.tab-btn {
  flex: 1;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 0;
  transition: opacity .15s;
}
.tab-btn i { font-size: 22px; color: var(--muted); transition: color .2s; }
.tab-btn span { font-size: 10px; color: var(--muted); transition: color .2s; }
.tab-btn.active-q i, .tab-btn.active-q span { color: var(--q); }
.tab-btn.active-d i, .tab-btn.active-d span { color: var(--d); }
.tab-btn.active-m i, .tab-btn.active-m span { color: var(--m); }
</style>
