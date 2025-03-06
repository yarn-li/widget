import { reactive, watch } from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget } from "@widget-frontend/widget-frontend-core";


import BaseFromItem from "./form-item/index.vue"
import TooltipBox from "./form-item/TooltipBox.vue"
import dataFormat from "./utils/dataFormat.ts";
/**
 * The WidgetComponent definition
 */
export class BasicText extends BasicComponent {
    /** Represent value */
    private _state: Record<string, any>;
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    // ------------------------------------------------------
    override componentCreated() {
        this._accessor = this._vvd.access(this)
        const label = this._accessor.getLabel()
        this._state = reactive({ value: this.dumpsValueState() })
        // console.info(label + " created")
        watch(() => this._state.value, (newValue, oldValue) => {
            // console.info("watch old value :", oldValue, " new value :", newValue)
            // Todo: Here, drive rcd!
            this.setValueState(newValue)
        })
        super.componentCreated()
    }

    // ------------------------------------------------------
    /** listen value change triggered by component linkage */
    override handleValueChange(value: any) {
        // Todo: Here, update view's value!
        this._state.value = value
    }

    formatData() {
        const valueMapping: Array<{value: string, label: string}> = this._accessor.getOptions().valueMapping
        if (Array.isArray(valueMapping)) {
            const realValue = valueMapping.find((ele) => {
                return ele.value === this._state.value
            })
            return realValue ? realValue.label : this._state.value
        }
        return  this._state.value
    }

    /** The core render function */
    override render() {
        if (!this._accessor.getVisible()) return
        return <BaseFromItem label={this._accessor.getLabel()}>
            <TooltipBox content={dataFormat.format(this.formatData(), this._accessor.getOptions().format)} key={this.uuid()}>
                <el-text ref="text" >
                    {dataFormat.format(this.formatData(), this._accessor.getOptions().format)}
                </el-text>
            </TooltipBox>
        </BaseFromItem>;
    }
}

defineWidget('text', (parent: WidgetComponent) => new BasicText(parent))

