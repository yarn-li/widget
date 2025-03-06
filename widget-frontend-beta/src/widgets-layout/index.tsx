import {defineLayout, WidgetComponent} from "@widget-frontend/widget-frontend-core";
import { VNodeChild } from "@vue/runtime-core";

defineLayout("VLinearLayout", (layout: Record<string, any>, nodes: VNodeChild[]) => <el-row class="vlinearlayout">{nodes.map(ele => <el-col>{ele}</el-col>)}</el-row>)
defineLayout("HLinearLayout", (layout: Record<string, any>, nodes: VNodeChild[]) => <el-row class="vlinearlayout">{nodes}</el-row>)
defineLayout("GridCol", (layout: Record<string, any>, nodes: VNodeChild[]) => {
    return  nodes.map((ele, index) => {
        const eleLayout = layout.children[index] || {}
        const span = eleLayout.options && eleLayout.options.span ? eleLayout.options.span : 24
        return <el-col  span={span}>{ele}</el-col>
    })
})