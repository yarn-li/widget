import { reactive } from "vue";
import { defineWidget, BasicComponent, WidgetComponent, WidgetAccessor } from "@widget-frontend/widget-frontend-core";

export class IdWidget extends BasicComponent {

    /** Represent value */
    private _state: Record<string, any>;
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    // ------------------------------------------------------
    override componentCreated() {
        this._state = reactive({ value: this.dumpsValueState() })
    }

    render() {
        return null
    }
}

defineWidget('id', (parent: WidgetComponent) => new IdWidget(parent))
