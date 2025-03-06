import { reactive, watch } from "vue";
import {
    WidgetComponent,
    BasicComponent,
    WidgetAccessor,
    defineWidget,
    internation
} from "@widget-frontend/widget-frontend-core";

import BaseFromItem from "./form-item/index.vue"
import {Input} from "./Input.tsx";
/**
 * The WidgetComponent definition
 */
export class InputPassword extends Input {
    /** The core render function */
    override render() {
        if(!this._accessor.getVisible()) return null
        return <BaseFromItem label={this._accessor.getLabel()} required={this._accessor.getRequired()} message={this._accessor.getErrorMessage()}>
            <el-input type="password"
                v-model={this._state.value}
                onInput={() => { this.setValueState(this._state.value); this.validate(); this.emit('input') }}
                onChange={() => { this.setValueState(this._state.value) }}
                onFocus={(e) => { this.focus(e) }}
                onBlur={(e) => { this.blur(e) }}
                placeholder={ this._accessor.getPlaceholder() || `${internation.translate('widget.pleaseInput', '请输入')}${internation.translate(this._accessor.getLabel())}` }
                disabled={!this._accessor.getEditable()}
                clearable={true}
            ></el-input>
        </BaseFromItem>;
    }
}

defineWidget('input-password', (parent: WidgetComponent) => new InputPassword(parent))