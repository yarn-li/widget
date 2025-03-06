import {ContainerComponent, defineWidget, WidgetAccessor, WidgetComponent} from "@widget-frontend/widget-frontend-core";
import {reactive} from "vue";
import {VNodeChild} from "@vue/runtime-core";
import FormContainer from "./components/FormContainer.vue";
import "../style-css/form.css"

export class FormWidget extends ContainerComponent implements ContainerComponent {
    /** Represent value */
    private _state: Record<string, any>;
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    // ------------------------------------------------------
    override componentCreated() {
        super.componentCreated()
        this._accessor = this._vvd.access(this)
        const label = this._accessor.getLabel()
        this._state = reactive({ value: this.dumpsValueState() })
    }

    hasLayout() {
        return !!this._accessor.getLayout()
    }

    render(): VNodeChild {
        if (!this._accessor.getVisible()) return null
        return <div class="form">
                <FormContainer countLength={this.getChildren().filter(ele => {
                    const accessor = ele.getVueViewDriver().access(ele)
                    return accessor.getVisible()
                }).length}>
                    {this.hasLayout() ? this.layoutVirtualChildren() : this.subviews()}
                </FormContainer>
            </div>
    }
}

defineWidget('form', (parent: WidgetComponent) => new FormWidget(parent))

export class Container extends ContainerComponent implements ContainerComponent {
    /** Represent value */
    private _state: Record<string, any>;
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    // ------------------------------------------------------
    override componentCreated() {
        super.componentCreated()
        this._accessor = this._vvd.access(this)
        const label = this._accessor.getLabel()
        this._state = reactive({ value: this.dumpsValueState() })
    }

    hasLayout() {
        return !!this._accessor.getLayout()
    }

    render(): VNodeChild {
        if (!this._accessor.getVisible()) return null
        return <div class="form">
                {this.hasLayout() ? this.layoutVirtualChildren() : this.subviews()}
        </div>
    }
}

defineWidget('container', (parent: WidgetComponent) => new FormWidget(parent))
defineWidget('page', (parent: WidgetComponent) => new Container(parent))