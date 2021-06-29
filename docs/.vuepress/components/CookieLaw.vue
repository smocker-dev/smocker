<template>
  <footer>
    <cookie-law theme="vuepress">
      <div slot="message">
        This site uses Google Analytics, a web analytics service provided by
        Google, Inc. Google Analytics sets a cookie in order to evaluate our use
        of our website and compile reports on user activity.
      </div>
    </cookie-law>
  </footer>
</template>

<script>
import CookieLaw from "vue-cookie-law";
export default {
  components: { CookieLaw },
};
</script>

<style>
.Cookie--vuepress {
  background: rgb(255, 255, 237);
  border-top: 1px solid #fff2e2;
  padding: 1.5em;
}

.Cookie--vuepress .Cookie__button {
  color: #fff;
  background: #3eaf7c;
  padding: 0.5em;
  border: none;
  border-radius: 4px;
}

.Cookie--vuepress .Cookie__button:hover {
  background: #4abf8a;
}
</style>
