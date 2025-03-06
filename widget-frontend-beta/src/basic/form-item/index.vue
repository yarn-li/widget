<template>
    <div :class="['x-form-basic-widget',]">
        <div class="x-form-basic-widget__label" v-if="label && label != ''">
            <TooltipBox style="justify-content: flex-end">
                <span style="max-width: 100%">
                    <span :class="[required ? 'required' : '']"></span>
                    <label :class="['x-form-label']">
                        {{ internation.translate(label) }}
                    </label>
                </span>
            </TooltipBox>
        </div>
        <div class="x-widget-inner-el">
            <slot></slot>
            <div class="tips" v-if="description">
                <el-tooltip :content="description" placement="top" effect="dark">
                    <el-icon color="#333" size="18">
                        <Warning />
                    </el-icon>
                </el-tooltip>
            </div>
            <div class="validate-message">{{ message }}</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { internation } from "@widget-frontend/widget-frontend-core";
import {ElTooltip, ElIcon} from "element-plus"
import { toRef } from "vue"
import { Warning } from '@element-plus/icons-vue'
import TooltipBox from "./TooltipBox.vue";
const props = defineProps(['label', 'labelWidth', 'required', 'message', 'description'])
const label = toRef(props, 'label')
const labelWidth = toRef(props, 'labelWidth')
const required = toRef(props, 'required')
const message = toRef(props, 'message')
const description = toRef(props, 'description')
</script>

<style scoped>
.x-form-basic-widget {
    width: 100%;
    position: relative;
    display: flex;
    flex: 1;
    margin: 0.5rem 0 1.2rem 0.1rem;
    align-items: center;
}

.x-form-basic-widget__label {
    flex-shrink: 0;
    margin-right: 4px;
    margin-left: 4px;
    max-width: 120px;
}

.x-form-label {
    position: relative;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    margin-right: .5rem;
    text-align: right;
    flex-shrink: 0;
    display: block;
    font-size: 14px;
    color: #333;
    line-height: 28px;
}


.x-widget-inner-el {
    line-height: 24px;
    display: flex;
    align-items: center;
    min-width: 60px;
    position: relative;
    width: 100%;
    box-sizing: border-box;
}
.tips {
    position: absolute;
    right: 0;
    height: 24px;
    display: flex;
    align-items: center;
    width: 20px;
    color: #333;
    cursor: pointer;
}
.validate-message {
    position: absolute;
    left: 0;
    top: 100%;
    color: red;
    font-size: 0.75rem;
}

:deep(.el-select) {
    flex: 1;
}

.x-widget-inner-el>:deep(.el-input-number) {
    flex: 1;
}

:deep(.el-date-editor) {
    flex: 1;
}
.required {
    position: relative;
}
.required:before {
    position: absolute;
    top: -3px;
    left: -5px;
    content: '*';
    color: #f56c6c
}
.sticky-label .x-form-basic-widget__label {
   align-self: flex-start;
}

</style>
