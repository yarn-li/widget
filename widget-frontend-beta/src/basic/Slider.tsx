import { reactive, watch } from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget } from "@widget-frontend/widget-frontend-core";
import BaseFromItem from "./form-item/index.vue"

export class Slider extends BasicComponent {
    /** Represent value */
    private _state: Record<string, any>;
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;

    override componentCreated() {
        this._accessor = this._vvd.access(this)
        this._state = reactive({ value: this.dumpsValueState() })
        watch(() => this._state.value, (newValue, oldValue) => {
            // drive rcd!
            this.setValueState(newValue)
        })
        super.componentMounted()
    }

    /** listen value change triggered by component linkage */
    override handleValueChange(value: any) {
        // Todo: Here, update view's value!
        this._state.value = value
    }

    override render() {
        if(!this._accessor.getVisible()) return null
        return <BaseFromItem label={this._accessor.getLabel()} required={this._accessor.getRequired()} message={this._accessor.getErrorMessage()}>
            <el-slider
                style='padding-left:10px'
                v-model={this._state.value}
                onChange={(val) => {this.setValueState(this._state.value); this.validate(); this.emit('change', val)}}
                onInput={(val) => {this.emit('input', val)}}
                disabled={!this._accessor.getEditable()}
                step={this._accessor.getOptions()['step'] || 1}
                min={this._accessor.getOptions()['min']}
                max={this._accessor.getOptions()['max']}
                show-stops={this._accessor.getOptions()['step']}
                show-input={this._accessor.getOptions()['show-input']}
            />
        </BaseFromItem>;
    }
}

defineWidget('slider', (parent: WidgetComponent) => new Slider(parent))