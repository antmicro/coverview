<template>
  <div class="not-found">
    <h1>404</h1>
    <p>The page you're looking for doesn't exist.</p>
      <RouterLink to="/" class="home-button">Back to Overview</RouterLink>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
  min-height: 50vh;
}

h1 {
  font-size: 6rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

p {
  color: var(--text-muted);
  font-size: 1.25rem;
  margin-bottom: 2rem;
}

.actions {
  display: flex;
  gap: 1rem;
}

.home-button {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  background: var(--accent-background);
  border: 1px solid var(--accent-border);
  color: var(--text-primary);
}

.home-button:hover {
  border-color: var(--accent-primary);
}

@media (max-width: 768px) {
  h1 {
    font-size: 4rem;
  }
  
  p {
    font-size: 1rem;
  }
}
</style>
