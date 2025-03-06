<template>
    <div class="query-content" ref="queryContent">
        <slot></slot>
        <div class='crud-query-buttonBox'>
            <el-button
                class="search-btn"
                type="primary"
                @click="search"
                :icon="Search"
                size="small"
            >
                {{internation.translate('widget.search', '搜索')}}
            </el-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { internation } from "@widget-frontend/widget-frontend-core";
import { Search } from '@element-plus/icons-vue'
import { onMounted, ref } from "vue"
const queryContent = ref()

const emit = defineEmits(['searchBtnClick'])
function search() {
    emit('searchBtnClick')
}

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

function setLabelWidth(queryContent: HTMLDivElement) {
    const childNodes = queryContent.childNodes
    const widgetNodes = []
    let maxLabelWidth = 0
    childNodes.forEach((node:HTMLDivElement) => {
        const widgetNode = node.firstElementChild
        if (widgetNode && widgetNode.className === 'x-form-basic-widget') {
            widgetNodes.push(widgetNode)
            const nodeWidth = getWidth(widgetNode.firstElementChild)
            maxLabelWidth = nodeWidth > maxLabelWidth ? nodeWidth : maxLabelWidth
        }
    })

    const maxWidth = 120 > maxLabelWidth ? maxLabelWidth : 120

    widgetNodes.forEach((widgetNode: HTMLDivElement) => {
        (widgetNode.firstElementChild.firstElementChild.firstElementChild as HTMLDivElement).style.width = maxWidth + 'px'
    })
}

onMounted(() => {
    setLabelWidth(queryContent.value)
})

</script>

<style scoped>
.query-content {
    display: flex;
    flex-wrap: wrap
}

.search-btn {
    height: var(--w-line-height-base);
}

.crud-query-buttonBox {
    display: flex;
    margin: 0 0 5px 0;
    align-items: center;
    /* padding-left: 10px; */
}
</style>