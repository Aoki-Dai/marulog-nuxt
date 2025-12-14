<script setup lang="ts">
import { CATEGORIES } from '~/types'
import type { ActivityCategoryId } from '~/types'

defineProps<{
  modelValue?: ActivityCategoryId | null
  disabled?: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: ActivityCategoryId): void
}>()
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <button
      v-for="category in CATEGORIES"
      :key="category.id"
      type="button"
      :disabled="disabled"
      class="flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 border-2"
      :class="[
        modelValue === category.id 
          ? `border-primary-500 bg-primary-50 dark:bg-primary-900/10 ${category.color.split(' ')[0]}` 
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'
      ]"
      @click="$emit('update:modelValue', category.id)"
    >
      <div 
        class="w-10 h-10 rounded-full flex items-center justify-center mb-2"
        :class="[modelValue === category.id ? category.color : 'bg-gray-100 dark:bg-gray-800 text-gray-500']"
      >
        <UIcon :name="category.icon" class="w-6 h-6" :class="[modelValue === category.id ? 'text-white' : '']" />
      </div>
      <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ category.label }}</span>
    </button>
  </div>
</template>
