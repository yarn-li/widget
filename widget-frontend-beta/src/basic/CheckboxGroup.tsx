import { reactive, watch } from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget } from "@widget-frontend/widget-frontend-core";
import BaseFromItem from "./form-item/index.vue"
/**
 * The WidgetComponent definition
 */
export class CheckboxGroup extends BasicComponent {
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
           <el-checkbox-group 
                v-model={this._state.value}
                onChange={() => { this.setValueState(this._state.value);  this.validate(); this.emit('change') }}
                disabled={!this._accessor.getEditable()}
           >
                {
                    this._accessor.getOptions().options ? 
                        this._accessor.getOptions().options.map(item => <el-checkbox key={item.value} label={item.value}>{item.label}</el-checkbox>) 
                        : null
                }   
           </el-checkbox-group>
        </BaseFromItem>;
    }
}

defineWidget('checkbox-group', (parent: WidgetComponent) => new CheckboxGroup(parent))