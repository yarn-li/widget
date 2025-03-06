<template>
    <el-dialog :title="title" v-model="visible" append-to-body={true} width="30%">
        <el-checkbox-group>
        </el-checkbox-group>
    </el-dialog>
</template>

<script setup>
import {reactive, defineProps, toRef} from "vue"
import {internation} from "@widget-frontend/widget-frontend-core"

const title = internation.translate('显隐列')
const props = defineProps({visible: false})
const visible = toRef(props, 'visible')
</script>

<style scoped>
.item {
    border: solid 1px #eee;
    padding: 6px 10px;
    text-align: left;
    display: flex;
}

.text {
    flex: 1;
}

.item:hover {
    cursor: move;
}
.item + .item {
    margin-top: 10px;
}
.ghost {
    border: solid 1px rgb(19, 41, 239);
}
.chosenClass {
    background-color: #f1f1f1;
}
</style>