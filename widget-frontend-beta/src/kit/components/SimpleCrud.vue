<template>
    <div :class="`simple-crud simple-crud__${props.uuid}`" ref="simpleCrud">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
    import {reactive, ref, onMounted, defineProps} from "vue"
    const simpleCrud = ref()
    const props = defineProps(['uuid'])
    onMounted(() => {
        const tableNode = document.querySelector(`.simple-crud__${props.uuid} .crud-table`) as HTMLDivElement
        const paginationNode = document.querySelector(`.simple-crud__${props.uuid} .crud-pagination`) as HTMLDivElement
        tableNode.style.height = `calc(100% - ${tableNode.offsetTop}px - ${paginationNode.clientHeight}px)`
    })     
</script>