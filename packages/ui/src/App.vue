<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router';
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-logo">Lockwise</h1>
      <nav class="app-nav">
        <RouterLink to="/" class="nav-link">Dashboard</RouterLink>
        <RouterLink to="/history" class="nav-link">History</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  gap: 32px;
}

.app-logo {
  font-size: 1.25rem;
  font-weight: 600;
}

.app-nav {
  display: flex;
  gap: 16px;
}

.nav-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.15s ease, background 0.15s ease;
}

.nav-link:hover {
  color: var(--color-text);
}

.nav-link.router-link-active,
.nav-link.router-link-exact-active {
  color: var(--color-info);
  background: color-mix(in srgb, var(--color-info) 10%, transparent);
  font-weight: 500;
}

.app-main {
  flex: 1;
  padding: 24px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}
</style>
