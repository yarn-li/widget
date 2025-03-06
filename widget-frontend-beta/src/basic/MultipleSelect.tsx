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
export class MultipleSelect extends BasicComponent {
    /** Represent value */
    private _state: Record<string, any>;
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
    /** The core render function */
    override render() {
        if(!this._accessor.getVisible()) return null
        return <BaseFromItem label={this._accessor.getLabel()} required={this._accessor.getRequired()} message={this._accessor.getErrorMessage()}>
            <el-select
                v-model={this._state.value}
                onChange={() => { this.setValueState(this._state.value); this.validate(); this.emit('change') }}
                multiple
                collapse-tags
                collapse-tags-tooltip 
                multiple-limit={this._accessor.getOptions().multipleLimit || 0}
                max-collapse-tags={2}
                placeholder={ this._accessor.getPlaceholder() || `${internation.translate('widget.pleaseSelect', '请选择')}${internation.translate(this._accessor.getLabel())}` }
                disabled={!this._accessor.getEditable()}
                filterable
                clearable
            >
                {
                    this._accessor.getOptions().options ? this._accessor.getOptions().options.map(item => <el-option key={item.value} label={item.label} value={item.value}>{item.lable}</el-option>) : null
                }
            </el-select>
        </BaseFromItem>;
    }
}

defineWidget('multiple-select', (parent: WidgetComponent) => new MultipleSelect(parent))