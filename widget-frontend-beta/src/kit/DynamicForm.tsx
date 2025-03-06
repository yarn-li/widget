import { reactive, watch } from "vue";
import { DynamicContainerComponent, WidgetAccessor, WidgetComponent, defineWidget } from "@widget-frontend/widget-frontend-core";

class NormalDynamicContainerComponent extends DynamicContainerComponent {
    /** Represent value */
    private _state: Record<string, any>;
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;

    proxySchema(wcd: Record<string, any>) {
        return wcd
    }

    render() {
        if (!this.getVueViewDriver().access(this).getVisible()) return null
        return <div>
            <el-button onClick={() => {this.addOne()}}>add one
            </el-button>
            <el-button onClick={() => {this.clearAll()}}>clear
            </el-button>
            {this.subviews()}
        </div>;
    }



    addOne() {
        this.addSubComponent()
    }

    remoteByIndex(index: number) {
        this.spliceSubComponents(index, 1)
    }

    clearAll() {
        this.clearSubComponents()
    }
}

defineWidget('dynamic-form', (parent: WidgetComponent) => new NormalDynamicContainerComponent(parent))