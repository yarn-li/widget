import { DynamicContainerComponent, WidgetComponent, defineWidget } from "@widget-frontend/widget-frontend-core";

class DynamicContainer extends DynamicContainerComponent {
    /** Represent value */
    private _state: Record<string, any>;

    proxySchema(wcd: Record<string, any>) {
        return wcd
    }

    render() {
        if (!this.getVueViewDriver().access(this).getVisible()) return null
        return <div class='dynamic-container'>
            {this.subviews()}
        </div>;
    }
}

defineWidget('dynamic-container', (parent: WidgetComponent) => new DynamicContainer(parent))