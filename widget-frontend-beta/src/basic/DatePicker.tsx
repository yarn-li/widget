import { reactive, watch } from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget } from "@widget-frontend/widget-frontend-core";

import BaseFromItem from "./form-item/index.vue"
/**
 * The WidgetComponent definition
 */
export class DatePicker extends BasicComponent {
    /** Represent value */
    private _state: {value: number} = reactive({value: null});
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    // ------------------------------------------------------
    override componentCreated() {
        this._accessor = this._vvd.access(this)
        const label = this._accessor.getLabel()
        this._state = reactive({ value: this.dumpsValueState() })
 
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
    }

    getType() {
        if (this._accessor.getOptions().dateType) {
            return this._accessor.getOptions().dateType
        } else {
            if(this._accessor.getOptions().format && this._accessor.getOptions().format.includes('HH')) {
                return 'datetime'
            } else if(this._accessor.getOptions().format && !this._accessor.getOptions().format.includes('DD')) {
                return 'month'
            } else if (this._accessor.getOptions().format && this._accessor.getOptions().format === ('YYYY')) {
                return 'year'
            }

            return "date"
        }
    }

    getFormat() {
        return this._accessor.getOptions().format || "YYYY-MM-DD HH:mm:ss"
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
                onChange={() => { this.setValueState(this._state.value); this.validate(); this.emit('change') }}
                onFocus={() => { this.emit('focus') }}
                onBlur={() => { this.emit('blur') }}
                disabled={!this._accessor.getEditable()}
                placeholder={'请选择' + this._accessor?.getLabel() ?? ''}
                clearable
                size="small"
            ></el-date-picker>
        </BaseFromItem>;
    }
}

defineWidget('date-picker', (parent: WidgetComponent) => new DatePicker(parent))