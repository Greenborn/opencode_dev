<template>
  <div class="demo-shell">
    <nav class="demo-nav">
      <a href="#/">Inicio</a>
      <a href="#/login-redirect">Callback</a>
    </nav>
    <main class="demo-main">
      <router-view />
    </main>
  </div>
</template>

<style>
.demo-shell {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem;
  color: #1f2933;
}
.demo-nav {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1rem;
}
.demo-nav a {
  color: #1a73e8;
  text-decoration: none;
}
.demo-main {
  margin-top: 1rem;
}
button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  cursor: pointer;
}
button:hover {
  background: #e2e8f0;
}
code {
  background: #f1f5f9;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}
</style>
