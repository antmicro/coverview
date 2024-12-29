import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.directive('inline-svg', el => {
  if (!el) {
    return
  }

  // copy attributes to first child
  const content = el.tagName === 'TEMPLATE' ? el.content : el
  if (content.children.length === 1) {
    ;[...el.attributes].forEach((attr) => content.firstChild.setAttribute(attr.name, attr.value))
  }

  // replace element with content
  if (el.tagName === 'TEMPLATE') {
    el.replaceWith(el.content)
  } else {
    el.replaceWith(...el.children)
  }
});

app.use(router)

app.mount('#app')
