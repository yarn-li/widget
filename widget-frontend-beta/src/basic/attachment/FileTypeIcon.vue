<template>
    <el-image class="image-icon" style="" shape="square" :src="icon[props.iconName]" />
</template>

<script lang="ts" setup>
import imageIcon from "./image-icon.png"
import pdfIcon from "./pdf-icon.png"
import {reactive, ref} from "vue";
const icon = reactive({
    'imageFile': imageIcon,
    'pdfFile': pdfIcon
})
const props = defineProps(['iconName'])

</script>

<style scoped>
.image-icon {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    margin-right: 8px;
}
</style>