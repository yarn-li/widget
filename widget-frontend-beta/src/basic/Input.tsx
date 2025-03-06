import { reactive, watch } from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget, internation } from "@widget-frontend/widget-frontend-core";

import BaseFromItem from "./form-item/index.vue"

interface Focusable {
    focus(e: Event);

    blur(e: Event);
}

abstract class PreventRefocusFocusable implements Focusable {
    private focusElement = reactive({value: null})
    focus(e: Event) {
        if (e.target !== this.focusElement.value) {
            this.focusElement.value = e.target;
            this.doFocus(e);
        }
    }

    blur(e: Event) {
        if (e.target !== document.activeElement) {
            this.doBlur(e);
            this.focusElement.value = null
        }
    }

    abstract doFocus(e: Event);

    abstract doBlur(e: Event);
}

export class Input extends BasicComponent implements Focusable{
    errorMessage = reactive({value: ""})
    /** Represent value */
    _state: Record<string, any> = reactive({value: null});
    /** For Widget attribute accessing */
    _accessor: WidgetAccessor = null;
    private focusElement = reactive({value: null})
    override componentCreated() {
        this._accessor = this._vvd.access(this)
        this._state = reactive({ value: this.dumpsValueState() })
        watch(() => this._state.value, (newValue, oldValue) => {
             // drive rcd!
            // this.setValueState(newValue)
        })
        super.componentMounted()
    }

    /** listen value change triggered by component linkage */
    override handleValueChange(value: any) {
        // Todo: Here, update view's value!
        this._state.value = value
    }

    focus(e: Event) {
        if (e.target !== this.focusElement.value) {
            this.focusElement.value = e.target;
            this.doFocus(e);
        }
    }

    blur(e: Event) {
        if (e.target !== document.activeElement) {
            this.doBlur(e);
            this.focusElement.value = null
        }
    }

    doFocus(e: Event) {
        this.emit('focus')
    }

    doBlur(e: Event) {
        this.emit('blur')
    }

    override render() {
        if(!this._accessor.getVisible()) return null 
        return <BaseFromItem label={this._accessor.getLabel()} required={this._accessor.getRequired()} message={this._accessor.getErrorMessage()}>
            <el-input
                v-model={this._state.value}
                onInput={() => { this.setValueState(this._state.value); this.validate(); this.emit('input') }}
                onFocus={(e: Event) => { this.focus(e) }}
                onBlur={(e: Event) => { this.blur(e) }}
                placeholder={ this._accessor.getPlaceholder() || `${internation.translate('widget.pleaseInput', '请输入')}${internation.translate(this._accessor.getLabel())}` }
                disabled={!this._accessor.getEditable()}
                clearable={true}
                onKeydown={(e: KeyboardEvent) => {
                    if (e.code === 'Enter') {
                        this.doBlur(e);
                    }
                }}
            ></el-input>
        </BaseFromItem>;
    }
}

defineWidget('input', (parent: WidgetComponent) => new Input(parent))