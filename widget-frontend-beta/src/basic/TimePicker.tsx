import {computed, reactive, watch} from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget } from "@widget-frontend/widget-frontend-core";
import {parseTime} from "./utils/comm.ts"

import BaseFromItem from "./form-item/index.vue"
/**
 * The WidgetComponent definition
 */
export class TimePicker extends BasicComponent {
    /** Represent value */
    private _state: {value: number} = reactive({value: null});
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    private realValue = reactive({value: null})
    // ------------------------------------------------------
    override componentCreated() {
        this._accessor = this._vvd.access(this)
        const label = this._accessor.getLabel()
        this._state = reactive({ value: this.dumpsValueState() })
        this.realValue.value = parseTime(this._state.value, `YYYY-MM-DD ${this.getFormat()}`)

        watch(() => this._state.value, (newValue, oldValue) => {
            // console.info("watch old value :", oldValue, " new value :", newValue)
            // Todo: Here, drive rcd!
            this.setValueState(newValue)
        })
    }
    
    // ------------------------------------------------------
    /** listen value change triggered by component linkage */
    override handleValueChange(value: any) {
        // Todo: Here, update view's value!
        this._state.value = value
        this.realValue.value = parseTime(value, `YYYY-MM-DD ${this.getFormat()}`)
    }

    getFormat() {
        return this._accessor.getOptions().format || "HH:mm:ss"
    }

    /** The core render function */
    override render() {
        if(!this._accessor.getVisible()) return null
        return <BaseFromItem label={this._accessor.getLabel()} required={this._accessor.getRequired()} message={this._accessor.getErrorMessage()}>
            <el-time-picker
                v-model={this.realValue.value}
                format={this.getFormat()}
                value-format = {`YYYY-MM-DD ${this.getFormat()}`}
                onChange={() => {const value = this.realValue.value === null ? null : new Date(this.realValue.value).getTime(); this.setValueState(value); this.validate(); this.emit('change') }}
                onFocus={() => { this.emit('focus') }}
                onBlur={() => { this.emit('blur') }}
                disabled={!this._accessor.getEditable()}
                placeholder={'请选择' + this._accessor?.getLabel() ?? ''}
                clearable
                size="small"
            ></el-time-picker>
        </BaseFromItem>;
    }
}

defineWidget('time-picker', (parent: WidgetComponent) => new TimePicker(parent))