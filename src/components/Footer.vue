<script setup>
const props = defineProps({
  logo: String,
  copyright: String,
  links: Object
})
</script>

<template>
  <footer class="footer">
    <div class="footer-left">
      <a href="https://github.com/antmicro/coverview"><img src="../assets/logo.svg" class="logo" /></a>
      <p class="copyright">{{ copyright }}</p>
    </div>
    <div class="footer-right">
      <a v-for="[text, href] in Object.entries(links)" :href="href" class="footer-link">{{ text }}</a>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  border-top: 1px solid var(--border-primary);
}

.footer-left {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}

.logo {
  height: 2rem;
  width: auto;
}

.copyright {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.footer-right {
  display: flex;
  gap: 1.5rem;
}

.footer-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.footer-link:hover {
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .footer {
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
    text-align: center;
  }

  .footer-left {
    align-items: center;
  }

  .footer-right {
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
  }
}
</style>
