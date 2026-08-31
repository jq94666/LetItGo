<script setup>
import { pdfSites } from '../../../data/sites.js'
import SiteCard from './SiteCard.vue'
</script>

<template>
  <div class="grid grid-cols-2 gap-apple-md sm:grid-cols-3 lg:grid-cols-4">
    <SiteCard v-for="site in pdfSites" :key="site.name" :site="site" />
  </div>
</template>