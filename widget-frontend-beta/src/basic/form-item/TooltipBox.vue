<template>
    <div class="x-tooltip-box" @mouseenter="onmouseenter"  ref="tooltipBox">
        <el-tooltip
            class="tooltip-item"
            effect="dark"
            :content="text.toString()"
            placement="top"
            :disabled="showTips"
            :show-after="100"
        >
            <slot></slot>
        </el-tooltip>
    </div>
</template>

<script setup lang="ts">
import {ElTooltip} from "element-plus"
import {ref, onMounted, nextTick, toRef, watch} from 'vue'
const showTips = ref(false)
const text = ref("")
const tooltipBox = ref()

const props = defineProps(['content'])
const content = toRef(props, 'content')

watch(content, (value) => {
    text.value = value
})

function onmouseenter(e) {
    showTips.value = !isOverflowed(e.target)
}

const isOverflowed = (el)=>{
    if(!el) return
    const range = document.createRange()
    range.setStart(el, 0)
    range.setEnd(el, el.childNodes.length)
    // 所有子节点的宽度总和
    const rangeWidth = range.getBoundingClientRect().width
    const getStyle = (el:HTMLElement,key:string)=>{
        if(!el || !key) return
        return getComputedStyle(el)?.[key]
    }
    // 还需要加上容器元素的左右padding
    const padding = (parseInt(getStyle(el, 'paddingLeft'), 10) || 0) + (parseInt(getStyle(el, 'paddingRight'), 10) || 0);
    // 内容实际宽度
    const scrollWidth = rangeWidth + padding
    // 内容当前宽度
    const clientWidth = el.getBoundingClientRect().width
    return clientWidth < scrollWidth
}

onMounted(() => {
    const firstElementChild = tooltipBox.value.firstElementChild
    text.value = content.value && content.value !== '' ? content.value.toString() : firstElementChild.innerText
})

</script>

<style scoped>
.x-tooltip-box {
    display: flex;
    width: 100%;
}
.tooltip-item {
    display: flex;
}
</style>