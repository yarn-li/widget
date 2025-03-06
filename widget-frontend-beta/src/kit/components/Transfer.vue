<template>
    <div :class="['w-base-transfer', `w-base-transfer__${uuid}`]">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
import {reactive, defineProps, toRefs, onMounted, nextTick} from "vue"
// import {internation} from "@widget-frontend/widget-frontend-core"

const prop = defineProps<{uuid: string}>()
const { uuid } = toRefs(prop)

onMounted(() => {
   nextTick(() => {
    const transfer = document.querySelector(`.w-base-transfer__${uuid.value}`) as HTMLDivElement
    const queryBox = transfer.querySelector('.crud-query') as HTMLDivElement
    const tableBox = transfer.querySelector('.selection-table') as HTMLDivElement
    tableBox.style.height = transfer.offsetHeight - queryBox.clientHeight - 70 + 'px'
   })
})

</script>

<style scoped>
.w-base-transfer {
    height: 100%;
    width: 100%;
}
</style>