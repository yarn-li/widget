<template>
    <div class="base-query-table" ref="baseQueryTable">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
import {reactive, ref, onMounted, nextTick, onUnmounted, onBeforeMount, inject} from "vue"
import {findChildNode} from "../../utils/common"
const baseQueryTable = ref()
const emit = defineEmits(['created'])
const queryNode = reactive({value: null})
const actionBarNode = reactive({value: null})
const summaryNode = reactive({value: null})
const paginationNode = reactive({value: null})
const tableNode = reactive({value: null})
const authControl = inject('authControl')


onBeforeMount(() => {
    emit("created", authControl)
})

onMounted(() => {
    queryNode.value = findChildNode(baseQueryTable.value, '.query-table__conditionForm') as HTMLDivElement
    actionBarNode.value = findChildNode(baseQueryTable.value, '.query-table__actionBar') as HTMLDivElement
    summaryNode.value = findChildNode(baseQueryTable.value, '.query-table__summary') as HTMLDivElement
    tableNode.value = findChildNode(baseQueryTable.value, '.query-table__table') as HTMLDivElement
    paginationNode.value = findChildNode(baseQueryTable.value, '.query-table__pagination') as HTMLDivElement
    handleResize()
    addResizeChangeListener()
    addTableSizeChangeListener()
})

const addResizeChangeListener = () => {
    window.addEventListener('resize', () => {
        handleResize()
        tableNode.value.style.height  = baseQueryTable.value.offsetHeight - tableNode.value.offsetTop - paginationNode.value.offsetHeight + 'px'
    })
}

const observer = ref()

const addTableSizeChangeListener = () => {
    observer.value = new ResizeObserver(handleResize);
    observer.value.observe(baseQueryTable.value, { box: "border-box" });
}

function handleResize() {
    const actionBarHeight =  actionBarNode.value ?  actionBarNode.value.offsetHeight + 'px' : '0px'
    tableNode.value.style.height  = `calc(100% - ${queryNode.value.offsetHeight + 'px'} - ${actionBarHeight} - ${summaryNode.value.offsetHeight + 'px'} - ${paginationNode.value.offsetHeight + 'px'})`
}


onUnmounted(() => {
    observer.value.disconnect()
    window.removeEventListener('resize', addResizeChangeListener)
})


</script>