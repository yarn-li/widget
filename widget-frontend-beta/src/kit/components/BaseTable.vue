<template>
    <div :class="['w-base-table', `w-base-table__${props.uuid}`]">
        <slot></slot>
        <div class="w-base-table__column-resize-proxy"></div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, toRef, onUnmounted, ref, watch, nextTick } from 'vue';

const props = defineProps<{ uuid: string, columns: Array<any>, rowLength: number}>();
const uuid = toRef(props, 'uuid')
const columns = toRef(props, 'columns')
const rowLength = toRef(props, 'rowLength')
watch([...columns.value], (val) => {
    if (!val) {
        handleResize()
    }
})

watch(rowLength, (val) => {
        if (val) {
        handleResize()
        setTimeout(() => {
            const lines = document.querySelectorAll(`.w-base-table__${uuid.value} .line`) as NodeListOf<HTMLDivElement>
            if (lines) {
                let maxWidth = 120
                lines.forEach((node: HTMLDivElement) => {
                    if (node.offsetWidth > maxWidth) {
                        maxWidth = node.offsetWidth
                    }
                })
                emit('handle-create', maxWidth + 20)
            }
        }, 20)
    }
})

const emit = defineEmits(['table-resize', 'handle-create'])
const bodyWrapperObserver = ref()
function addBodyScrollListener() {
    bodyWrapperObserver.value = new ResizeObserver(() => {
        wrapperList.value.forEach(node => {
            if (node.className.includes('body-wrapper')) {
                if (node.scrollWidth > node.clientWidth) {
                    if(!baseTable.value.className.includes(`w-base-table__scroll-end`)) {
                        baseTable.value.className = baseTable.value.className + ' ' + `w-base-table__scroll-end`
                    }
                } else {
                    if (baseTable.value.className.includes('w-base-table__scroll-end')) {
                        baseTable.value.className = baseTable.value.className.replace('w-base-table__scroll-end', '')
                    }
                }
            }
        })
    });
    bodyWrapperObserver.value.observe(bodyWrapper.value, { box: "border-box" });
    bodyWrapper.value.addEventListener('scroll', (e) => {
        const target = e.target as HTMLDivElement
        const scrollLeft: number = target.scrollLeft
        tableList.value.forEach(node => {
            if (node.className !== 'w-base-table__body-table') {
                (node as HTMLTableElement).style.left = -scrollLeft + 'px'
            }
        })
        if (target.clientWidth + target.scrollLeft === target.scrollWidth) {
            baseTable.value.className = baseTable.value.className.replace('w-base-table__scroll-end', '')
        } else {
            if (!baseTable.value.className.includes(`w-base-table__scroll-end`))
                baseTable.value.className = baseTable.value.className + ' ' + `w-base-table__scroll-end`
        }
        if (target.scrollLeft === 0) {
            baseTable.value.className = baseTable.value.className.replace('w-base-table__scroll-start', '')
        } else {
            if (!baseTable.value.className.includes(`w-base-table__scroll-start`))
                baseTable.value.className = baseTable.value.className + ' ' + `w-base-table__scroll-start`
        }
    })
}

const tableList = ref([])
const wrapperList = ref([])
const baseTable = ref()
const bodyWrapper = ref()
const headWrapper = ref()
const observer = ref()
const head = ref()
const body = ref()
const foot = ref()
const findBody = (tables: Array<HTMLTableElement>, className: string) => {
    return tables.find(node => node.className === className)
}

onMounted(() => {
    baseTable.value = document.querySelector(`.w-base-table__${uuid.value}`) as HTMLDivElement
    const wrapperNodes = document.querySelectorAll(`.w-base-table__${uuid.value} .w-base-table__wrapper`)
    const tableNodes = document.querySelectorAll(`.w-base-table__${uuid.value} .w-base-table__wrapper table`)
    bodyWrapper.value = document.querySelector(`.w-base-table__${uuid.value} .w-base-table__body-wrapper`) as HTMLDivElement
    headWrapper.value = document.querySelector(`.w-base-table__${uuid.value} .w-base-table__head-wrapper`) as HTMLDivElement

    tableNodes.forEach(node => tableList.value.push(node))
    wrapperNodes.forEach(node => wrapperList.value.push(node))
    head.value = findBody(tableList.value, 'w-base-table__head-table')
    body.value = findBody(tableList.value, 'w-base-table__body-table')
    foot.value = findBody(tableList.value, 'w-base-table__foot-table')
    addBodyScrollListener()
    nextTick(() => {
        addTableSizeChangeListener()
        addResizeChangeListener()
    })
})

// 容器
const handleResize = () => { 
    const footHeight = foot.value ? foot.value.offsetHeight : 0
    const headHeight = head.value ? head.value.offsetHeight : 0
    let width = baseTable.value.offsetWidth
    nextTick(() => {
        tableList.value.forEach((node) => {
            if (bodyWrapper.value.clientHeight < bodyWrapper.value.scrollHeight) {
                width = width - 6
            }
            if(node.className === 'w-base-table__body-empty' || node.className === 'w-base-table__body-table') {
                (node as HTMLTableElement).style.width = width - 2 + 'px'
                return
            } else {
                (node as HTMLTableElement).style.width = width + 'px'
            }
        })
        bodyWrapper.value.style.height = (baseTable.value as HTMLDivElement).offsetHeight - headHeight - footHeight + 'px'
        if (bodyWrapper.value.offsetHeight < bodyWrapper.value.scrollHeight) {
            headWrapper.value.style.marginRight = '6px'
            headWrapper.value.style['max-width'] = width + 30 + 'px'
        } else {
            headWrapper.value.style.marginRight = '0'
        }
    })
    emit('table-resize')
}

const addTableSizeChangeListener = () => {
    observer.value = new ResizeObserver(handleResize);
    observer.value.observe(baseTable.value, { box: "border-box" });
}

const addResizeChangeListener = () => {
    window.addEventListener('resize', () => {
        nextTick(() => {
            baseTable.value = document.querySelector(`.w-base-table__${uuid.value}`) as HTMLDivElement
            if (baseTable.value) {
                handleResize()
            }
        })
    })
}

onUnmounted(() => {
    bodyWrapper.value.removeEventListener('scroll', () => { })
    observer.value.disconnect()
    bodyWrapperObserver.value.disconnect()
    window.removeEventListener('resize', addResizeChangeListener)
})

</script>
