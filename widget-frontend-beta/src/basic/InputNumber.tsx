import { reactive, watch } from "vue";
import {
    WidgetComponent,
    BasicComponent,
    WidgetAccessor,
    defineWidget,
    internation
} from "@widget-frontend/widget-frontend-core";

import BaseFromItem from "./form-item/index.vue"
/**
 * The WidgetComponent definition
 */
export class InputNumber extends BasicComponent {
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

    /** The core render function */
    override render() {
        if(!this._accessor.getVisible()) return null
        return <BaseFromItem label={this._accessor.getLabel()} required={this._accessor.getRequired()} message={this._accessor.getErrorMessage()}>
            <el-input-number
                v-model={this._state.value}
                onChange={() => { this.setValueState(this._state.value); this.validate(); this.emit('input') }}
                controls-position="right"
                step={this._accessor.getOptions()['step'] || 1}
                precision={this._accessor.getOptions()['precision']}
                onFocus={() => {this.emit('focus') }}
                onBlur={() => { this.emit('blur') }}
                placeholder={ this._accessor.getPlaceholder() || `${internation.translate('widget.pleaseInput', '请输入')}${internation.translate(this._accessor.getLabel())}` }
                disabled={!this._accessor.getEditable()}
                max={this._accessor.getOptions()['max']}
                min={this._accessor.getOptions()['min']}
                title=""
                clearable
            ></el-input-number>
        </BaseFromItem>;
    }
}

defineWidget('input-number', (parent: WidgetComponent) => new InputNumber(parent))