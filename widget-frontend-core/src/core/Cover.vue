<script setup lang="ts">
import {onMounted, onUnmounted, ref} from "vue";
import {mbus} from "./bus.ts";

const emit = defineEmits<{ (event: 'close'): void }>()

const props = withDefaults(defineProps<{ coverClose?: boolean, name: string }>(), {coverClose: false})
const activeClass = ref('hide-overlay')
const timer = ref(null)

onMounted(() => {
    timer.value = setTimeout(() => {
        activeClass.value = 'fade-in'
    }, 80)
    mbus.subscribe(`fadeOut::${props.name}`, () => {
        activeClass.value = 'fade-out'
    })
})

onUnmounted(() => {
    mbus.unsubscribe(`fadeOut::${props.name}`)
    clearTimeout(timer)
})

function animationend() {
    if (activeClass.value === 'fade-in') {
        activeClass.value = ''
    }
}

</script>

<template>
    <div :class="['overlay', activeClass]" @animationend="animationend"
         style="display: flex; align-items: center; justify-content: flex-end">
        <div class="mask" @click="() => { if (coverClose) emit('close') }"></div>
        <slot @mousedown="e => e.stopPropagation()"></slot>
    </div>
</template>
<style scoped>
.overlay {
    position: absolute;
    z-index: -1;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
}

.hide-overlay {
    opacity: 0;
}

.mask {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: -1;
    /*background-color: rgba(0,0,0,.8); */
    background-color: rgba(0, 0, 0, 0.5);
    /* background-color: rgba(238, 238, 238, 0.9) */
}

.fade-in {
    animation: fadeIn .3s;
    animation-fill-mode: forwards;
    transition: all .3s;
}

.fade-out {
    animation: fadeOut 0.3s;
    animation-fill-mode: forwards;
    transition: all 0.3s;
}

@keyframes fadeIn {
    0% {
        opacity: 0;
    }

    80% {
        opacity: 0.8;
    }

    100% {
        opacity: 1;
    }
}

@keyframes fadeOut {
    0% {
        opacity: 1;
    }

    80% {
        opacity: 0.2;
    }

    100% {
        opacity: 0;
    }
}
</style>

<style>
.fade-in {
}

.fade-in .widget-view-dialog {
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    -webkit-transform-style: preserve-3d;
    transform-style: preserve-3d;
    -webkit-backface-visibility: hidden;
    perspective: 1000;
    animation: formTopToCenter .3s !important;
    animation-fill-mode: forwards !important;
    transition: all .3s !important;
}

.fade-out {
}

.fade-out .widget-view-dialog {
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    -webkit-transform-style: preserve-3d;
    transform-style: preserve-3d;
    -webkit-backface-visibility: hidden;
    perspective: 1000;
    animation: formCenterToTop .3s !important;
    animation-fill-mode: forwards !important;
    transition: all .3s !important;
}

@keyframes formTopToCenter {
    0% {
        transform: translateY(-200px);
        opacity: 0;
    }

    80% {
        transform: translateY(0px);
        opacity: 0.8;
    }

    100% {
        opacity: 1;
    }
}

@keyframes formCenterToTop {
    0% {
        transform: translateY(0px);
        opacity: 1;
    }

    80% {
        transform: translateY(-200px);
        opacity: 0.2;
    }

    100% {
        opacity: 0;
    }
}
</style>