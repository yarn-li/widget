import { reactive, watch } from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget } from "@widget-frontend/widget-frontend-core";

import BaseFromItem from "./form-item/index.vue"
import {parseTime} from "./utils/comm.ts";
/**
 * The WidgetComponent definition
 */
export class TimeRangePicker extends BasicComponent {
    /** Represent value */
    private _state: {value: number[]} = reactive({value: [null, null]});
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    private realValue = reactive({value: null})
    // ------------------------------------------------------
    override componentCreated() {
        this._accessor = this._vvd.access(this)
        const label = this._accessor.getLabel()
        this._state = reactive({ value: [this.dumpsValueState().start, this.dumpsValueState().end] })
        this.realValue.value = [this._state.value[0] ? parseTime(this._state.value[0], `YYYY-MM-DD ${this.getFormat()}`) : null, this._state.value[1] ? parseTime(this._state.value[1], `YYYY-MM-DD ${this.getFormat()}`) : null]
        // console.log(this.realValue, parseTime(this._state.value['start'], `YYYY-MM-DD ${this.getFormat()}`),  `YYYY-MM-DD ${this.getFormat()}`);
        
        watch(() => this._state.value, (newValue, oldValue) => {
            // console.info("watch old value :", oldValue, " new value :", newValue)
            // Todo: Here, drive rcd!
            this.setValueState({start: newValue ? newValue[0] : null, end: newValue ? newValue[1] : null})
        })
    }
    
    // ------------------------------------------------------
    /** listen value change triggered by component linkage */
    override handleValueChange(value: any) {
        // Todo: Here, update view's value!
        this._state.value = value
        this.realValue.value = [value.start ? parseTime(value['start'], `YYYY-MM-DD ${this.getFormat()}`) : null, value.end ? parseTime(value['end'], `YYYY-MM-DD ${this.getFormat()}`) : null]
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
                is-range
                range-separator="-"
                format={this.getFormat()}
                value-format = {`YYYY-MM-DD ${this.getFormat()}`}
                onChange={(x) => { this.setValueState({start: x ? new Date(x[0]).getTime() : null, end: x ? new Date(x[1]).getTime() : null}); this.validate(); this.emit('change') }}
                onFocus={() => { this.emit('focus') }}
                onBlur={() => { this.emit('blur') }}
                disabled={!this._accessor.getEditable()}
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                clearable
                size="small"
            ></el-time-picker>
        </BaseFromItem>;
    }
}

defineWidget('time-range-picker', (parent: WidgetComponent) => new TimeRangePicker(parent))