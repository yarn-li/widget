<template>
    <div class="form-container " ref="formContainer">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, toRef, watch } from "vue"
const formContainer = ref()

const props = defineProps(['countLength'])

const countLength = toRef(props, 'countLength')
watch(countLength, (val) => {
    nextTick(() => {
        setLabelWidth(formContainer.value)
    })
})

const getWidth = (el)=>{
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
    return scrollWidth
}

function setLabelWidth(formContainer: HTMLDivElement) {
    const childNodes = formContainer.querySelectorAll('.x-form-basic-widget')
    const widgetNodes = []
    let maxLabelWidth = 0
    childNodes.forEach((widgetNode:HTMLDivElement) => {
        widgetNodes.push(widgetNode)
            const nodeWdith = getWidth(widgetNode.firstElementChild)
            maxLabelWidth = nodeWdith > maxLabelWidth ? nodeWdith : maxLabelWidth
    })
    const maxWidth = maxLabelWidth > 120 ? 120 : maxLabelWidth
    widgetNodes.forEach((widgetNode: HTMLDivElement) => {
        (widgetNode.firstElementChild.firstElementChild as HTMLDivElement).style.width = maxWidth + 'px'
    })
}

onMounted(() => {
    setLabelWidth(formContainer.value)
})

</script>

<style>
.form-container {
    width: 100%;
}
</style>