<template>
    <div :class="['w-tree-table', `w-tree-table__${props.uuid}`]">
        <slot></slot>
    </div>
</template>

<script lang="ts" setup>
import {nextTick, onMounted, toRef, onUnmounted, ref, onUpdated} from 'vue';

const props = defineProps<{ uuid: string }>();
const uuid = toRef(props, 'uuid')

const setWidth = () => {
    const colList = document.querySelectorAll(`.w-tree-table__col`)
    const colSortList = {}
    colList.forEach(col => {
        const name = col.attributes['domProps-name'].value
        if (Object.keys(colSortList).includes(name)){
            colSortList[name].push(col)
        } else {
            colSortList[name] = []
            colSortList[name].push(col)
        }
    })
    Object.keys(colSortList).forEach((key: string) => {
        const list = colSortList[key]
        const width = list.reduce((pre, next) => {
            if (next.clientWidth > pre) {
                return next.clientWidth
            } else {
                return pre
            }
        }, 120)
        list.forEach(ele => {
            ele.width = width + 'px'
        })
    })
}

function  addBodyScrollListener (header: HTMLDivElement, body: HTMLDivElement) {
    body.addEventListener('scroll', (e) => {
        const scrollLeft: number = (e.target as HTMLDivElement).scrollLeft;
        (header as HTMLDivElement).scrollTo(scrollLeft, 0)
    } )
}

function setHeaderPadding() {
    refHeader.value.style = 'margin-right: 10px'
}

const refBody = ref()
const refHeader = ref()

onMounted(() => {
    const table = document.querySelector(`.w-tree-table__${uuid.value}`)
    const header = table.firstElementChild as HTMLDivElement
    refHeader.value = header
    const body = table.lastElementChild as HTMLDivElement
    refBody.value = body;
    (header.firstElementChild as HTMLDivElement).style.width = body.offsetWidth + 'px';
    (body.firstElementChild as HTMLDivElement).style.width = body.offsetWidth + 'px';
    addBodyScrollListener(header, body)
    setHeaderPadding(refHeader)
    nextTick(() => {
        setWidth()
    })
})

onUpdated(() => {
    nextTick(() => {
        setWidth()
    })
})

onUnmounted(() => {
    refBody.value.removeEventListener('scroll', () => {})
})

</script>
