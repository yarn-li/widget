import { reactive, watch } from "vue";
import { WidgetComponent, WidgetAccessor, defineWidget, internation } from "@widget-frontend/widget-frontend-core";
import BaseFromItem from "./form-item/index.vue"

import {Input} from "./Input.tsx";

export class InputArea extends Input {
    override render() {
        if(!this._accessor.getVisible()) return null
        return <BaseFromItem label={this._accessor.getLabel()} required={this._accessor.getRequired()} message={this._accessor.getErrorMessage()} class={'sticky-label'}>
            <el-input
                type="textarea"
                v-model={this._state.value}
                onInput={() => { this.setValueState(this._state.value); this.validate(); this.emit('input') }}
                onChange={() => { this.setValueState(this._state.value) }}
                onFocus={(e:Event) => { this.doFocus(e) }}
                onBlur={(e: Event) => { this.doBlur(e) }}
                placeholder={ this._accessor.getPlaceholder() || `${internation.translate('widget.pleaseInput', '请输入')}${internation.translate(this._accessor.getLabel())}` }
                disabled={!this._accessor.getEditable()}
                clearable={true}
            ></el-input>
        </BaseFromItem>;
    }
}

defineWidget('input-area', (parent: WidgetComponent) => new InputArea(parent))