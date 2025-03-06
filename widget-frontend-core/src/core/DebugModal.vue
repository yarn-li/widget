<template>
    <div class="debug-modal">
        <div class="debug-button" @click="openDebugModal">
            <el-icon size="22px"><Crop /></el-icon>
        </div>
        <div :class="['debug-container', show ? 'fadeIn' : 'fadeOut']" v-show="visible">   
            <div class="close-button" @click="openDebugModal">
                <el-icon size="24px"><CloseBold /></el-icon>
            </div>
            <div class="left">
                <ul style="width: 100%; list-style: none; padding: 0; margin: 0; font-size: .75rem;">
                    <li class="glut" style="margin: .5rem 0;">{{ parts.components.length === 0 ? '无组件' : `组件:
                        ${parts.components.length}` }}</li>
                    <li class="openapi-item" v-for="(component, ci) in parts.components" :key="'components-' + component"
                        :style="{ color: color_schemas[(ci + 1) % color_schemas.length] }">
                        {{ ci + 1 }}.{{ component }}
                    </li>
                    <li class="glut" style="margin: .5rem 0;">{{ parts.paths.length === 0 ? '无接口' : `接口: ${parts.paths.length}` }}
                    </li>
                    <li class="openapi-item" v-for="(path, pi) in parts.paths" :key="'paths-' + parts"
                        :style="{ color: color_schemas[(pi + 1) % color_schemas.length] }">
                        {{ pi + 1 }}.{{ path }}
                    </li>
                </ul>
            </div>
            <div class="right">
                <div class="handelBar">
                    <div class="icon" @click="doRender">
                        <el-tooltip
                            effect="dark"
                            content="重载编辑器当前schema"
                            placement="top"
                        >
                            <el-icon><RefreshRight /></el-icon>
                        </el-tooltip>
                    </div>
                    <div class="icon" @click="doClear">
                        <el-tooltip
                            effect="dark"
                            content="清除当前schema"
                            placement="top"
                        >
                            <el-icon><BrushFilled /></el-icon>
                        </el-tooltip>
                    </div>
                    <div class="icon" @click="doFormat">
                        <el-tooltip
                            effect="dark"
                            content="格式化"
                            placement="top"
                        >
                            <el-icon><List /></el-icon>
                        </el-tooltip>
                    </div>
                    <div class="icon" @click="doRenderBase">
                        <el-tooltip
                            effect="dark"
                            content="填充scehma初始模板"
                            placement="top"
                        >
                            <el-icon><EditPen /></el-icon>
                        </el-tooltip>
                    </div>
                </div>
                <div class="editArea" ref="editArea"></div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { watch, toRef, ref, toRaw, onMounted } from "vue";
import { Crop, CloseBold, RefreshRight, BrushFilled, List, EditPen } from "@element-plus/icons-vue";
import * as monaco from 'monaco-editor'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { WidgetContextObject, VueViewDriver } from "@widget-frontend/widget-frontend-core";

// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    return [
      {match: () => label === 'json', apply: () => new JsonWorker()},
      {match: () => ['typescript', 'javascript'].includes(label), apply: () => new TsWorker()},
      {match: () => true, apply: () => new EditorWorker()},
    ].filter(e => e.match())[0].apply()
  }
}



const props = defineProps(['schema'])
const schema = toRef(props, 'schema')
const editor = ref(null)

const visible = ref(false)
const show = ref(false)
const editArea = ref()
const parts = ref({components: [], paths: []})
const color_schemas = ['#409EFF']
const existsEditor = ref(false)

function handleEditorState() {
    if (!existsEditor.value) {
        setTimeout(() => {
            editor.value = monaco.editor.create(editArea.value, {value: editor.text, language: 'json', automaticLayout: true, minimap: {enabled: false}})
            write(JSON.stringify(schema.value, null, '  '))
            existsEditor.value = true
        }, 100)
    }
}

watch(schema, (val) => {
    if (val !== '') {
        const openApiManager = WidgetContextObject.build(schema.value)
        openApiManager.validateWidgetComponent()
        let vvd: VueViewDriver = new VueViewDriver(openApiManager.getTreeView(), openApiManager)
        Object.keys(vvd.OpenApiManager.getHttpFunctions()).sort().forEach(operation_id => parts.value.paths.push(operation_id))
        Array.from(vvd.OpenApiManager.getComponents().keys()).sort().forEach(components_path => parts.value.components.push(components_path))
    }
    if (editor.value) {
        toRaw(editor.value).setValue(JSON.stringify(schema.value, null, '  '))
    }
})

onMounted(() => {
    if (schema.value) {
        const openApiManager = WidgetContextObject.build(schema.value)
        openApiManager.validateWidgetComponent()
        let vvd: VueViewDriver = new VueViewDriver(openApiManager.getTreeView(), openApiManager)
        Object.keys(vvd.OpenApiManager.getHttpFunctions()).sort().forEach(operation_id => parts.value.paths.push(operation_id))
        Array.from(vvd.OpenApiManager.getComponents().keys()).sort().forEach(components_path => parts.value.components.push(components_path))
    }

})

const emit = defineEmits(['refresh'])

function doRender() {
    emit('refresh', read())
}

function doClear() {
    parts.value.components.splice(0, parts.value.components.length)
    parts.value.paths.splice(0, parts.value.paths.length)
    
    editor.error = null
    write('')
}

function doFormat() {

}

function doRenderBase() {
    write(JSON.stringify({ entry: {schema: {}}, components: { schemas: {} }, paths: {} }, null, '  '))
}

function write(text) {
    toRaw(editor.value).setValue(text)
}

function read() {
    return JSON.parse(toRaw(editor.value).getValue())
}

function openDebugModal() {
    show.value = !visible.value
    if(visible.value) {
        setTimeout(() => {
            visible.value = !visible.value
        }, 290)
    } else {
        visible.value = !visible.value
        handleEditorState()
    }
}
</script>

<style scoped>
.debug-modal {

}

.debug-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  height: 40px;
  width: 40px;
  border-radius: 50%;
  background-color: #409Eff;
  cursor: pointer;
  box-shadow: 0px 0px 6px rgba(0, 0, 0, .12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 10;
}

.debug-container {
    width: 50%;
    height: 75%;
    box-shadow: 0px 0px 6px rgba(0, 0, 0, .12);
    position: fixed;
    bottom: 40px;
    right: 40px;
    background-color: #fff;
    z-index: 9;
    animation-fill-mode: forwards;
    transition: all 0.3s;
    padding: 40px 20px 20px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;


}

.debug-container .close-button {
    position: absolute;
    top:0;
    left: 0;
    height: 40px;
    width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.debug-container .left {
    flex: 4;
    height: 100%;
    overflow-y: auto;
}

.debug-container .left .glut {
  box-sizing: border-box;
  padding: 0 1rem;
}

.debug-container .left .openapi-item {
  word-wrap: break-word;
  box-sizing: border-box;
  padding: .25rem 1rem;
  cursor: pointer;
  font-weight: bold;
}

.debug-container .left .openapi-item:hover {
  background-color: rgba(64, 158, 255, 1);
  color: #FFF !important;
}


.debug-container .right {
    flex: 6;
    height: 100%;
}

.debug-container .right .handelBar {
    height: 24px;
    display: flex;
    align-items: center;
    background-color: rgb(48, 65, 86);
    color: #fff;
    padding: 0 12px;
}

.debug-container .right .handelBar .icon {
    display: flex;
    align-items: flex-end;
    cursor: pointer;
    margin-right: 12px;
}

.debug-container .right .editArea {
    width: 100%;
    height: calc(100% - 40px);
}

.fadeIn {
    animation: fadeIn 0.3s;
}

.fadeOut {
    animation: fadeOut 0.3s;
}

@keyframes fadeIn {
    0%{
        opacity: 0;
        width: 0%;
        height: 0%;
    }
    100% {
        opacity: 1;
        width: 50%;
        height: 75%;
    }
}

@keyframes fadeOut {
    0% {
        opacity: 1;
        width: 50%;
        height: 75%;
    }
    100%{
        opacity: 0;
        width: 0%;
        height: 0%;
    }
}
</style>