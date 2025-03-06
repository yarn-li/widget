import { reactive, watch } from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget } from "@widget-frontend/widget-frontend-core";
import {exists} from "../basic/utils/comm.ts";
import BaseFromItem from "./form-item/index.vue"

let defaultTime = {start: '00:00:00', end: '23:59:59'}

/**
 * The WidgetComponent definition
 */
export class DateRangePicker extends BasicComponent {
    /** Represent value */
    private _state: {value: number[]} = reactive({value: [null, null]});
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    // ------------------------------------------------------
    override componentCreated() {
        this._accessor = this._vvd.access(this)
        const label = this._accessor.getLabel()
        this._state = reactive({ value: [this.dumpsValueState().start, this.dumpsValueState().end] })
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
        this._state.value = [value?.start??null, value?.end??null]
    }

    getType() {
        // return this._accessor.getOptions().dateType || "datetimerange"
        // getType() {
            if (this._accessor.getOptions().dateType) {
                return this._accessor.getOptions().dateType
            } else {
                if(this._accessor.getOptions().format && this._accessor.getOptions().format.includes('HH')) {
                    return 'datetimerange'
                } else if(this._accessor.getOptions().format && !this._accessor.getOptions().format.includes('DD')) {
                    return 'monthrange'
                } else if (this._accessor.getOptions().format && !this._accessor.getOptions().format.includes('MM')) {
                    return 'years'
                }
                return "daterange"
            // }
        }

    }

    getFormat() {
        return this._accessor.getOptions().format || "YYYY-MM-DD HH:mm:ss"
    }

    getDefaultTime() {
        if (exists(this._accessor.getOptions(), 'defaultTime')) {
            const defaultOption = this._accessor.getOptions().defaultTime
            if (defaultOption.start && defaultOption.start !== '') {
                defaultTime.start = defaultOption.start
            }
            if (defaultOption.end && defaultOption.end !== '') {
                defaultTime.end = defaultOption.end
            }
        }   
        return [new Date(`2000-01-01 ${defaultTime.start}`), new Date(`2000-02-01 ${defaultTime.end}`)]
    }

    /** The core render function */
    override render() {
        if(!this._accessor.getVisible()) return null
        return <BaseFromItem label={this._accessor.getLabel()} required={this._accessor.getRequired()} message={this._accessor.getErrorMessage()}>
            <el-date-picker
                v-model={this._state.value}
                type={this.getType()}
                format={this.getFormat()}
                value-format = "x"
                default-time={this.getDefaultTime()}
                onChange={(x) => { this.setValueState({start: x ? x[0] : null, end: x ? x[1] : null}); this.validate(); this.emit('change') }}
                onFocus={() => { this.emit('focus') }}
                onBlur={() => { this.emit('blur') }}
                disabled={!this._accessor.getEditable()}
                range-separator="-"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                clearable
                size="small"
            ></el-date-picker>
        </BaseFromItem>;
    }
}

defineWidget('date-range-picker', (parent: WidgetComponent) => new DateRangePicker(parent))