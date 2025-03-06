import {
    BasicComponent,
    WidgetComponent,
    WidgetEventClick,
    defineWidget,
    WidgetAccessor
} from "@widget-frontend/widget-frontend-core";
import BaseFromItem from "./form-item/index.vue"

export class ButtonWidget extends BasicComponent implements WidgetEventClick {
    private _accessor: WidgetAccessor = null

    override componentCreated() {
        super.componentCreated();
        this._accessor = this.getVueViewDriver().access(this)

    }

    click(): void {
        this.emit("click")
    }

    // 获取按钮内文本
    getButtonText() {
        if (this._accessor.getOptions()['valueAsName']) {
            return this.dumpsValueState()
        }
        return this._accessor.getLabel()

    }

    disabled() {
        return this._accessor.getOptions()['clickable'] ? !this._accessor.getOptions()['clickable'] : false
    }

    getStyle() {
        return this._accessor.getOptions()['style']
    }

    isLink() {
        return  this._accessor.getOptions()['type'] === 'text'
    }

    render() {
        if (!this._accessor.getVisible()) return null
        return <BaseFromItem label={this._accessor.getLabel()} showLabel={false}>
            <el-button  type={this.getStyle()} link={this.isLink()} onClick={() => this.click()} disabled={this.disabled()}>{this.getButtonText()}</el-button>
        </BaseFromItem>
    }
}

defineWidget('button', (parent: WidgetComponent) => new ButtonWidget(parent))

