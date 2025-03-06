import { reactive, watch } from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget } from "@widget-frontend/widget-frontend-core";
import BaseFromItem from "./form-item/index.vue"

export class Progress extends BasicComponent {
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
            <el-progress
                style={{width: '100%'}}
                percentage={(this._state.value * 100).toFixed(2) || 0}
                status={this._accessor.getOptions()['status']}
            ></el-progress>
        </BaseFromItem>;
    }
}

defineWidget('progress', (parent: WidgetComponent) => new Progress(parent))