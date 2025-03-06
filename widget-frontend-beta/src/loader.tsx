import { VNodeChild } from "@vue/runtime-core";
import {
    BasicComponent,
    WidgetComponent,
    DynamicContainerComponent,
    defineWidget,
} from "@widget-frontend/widget-frontend-core";
import './basic/index.ts'
import './kit/index.ts'
import './widgets-layout/index.tsx'
import './style-css/pretty.css'

defineWidget('dynamic', (parent: WidgetComponent) => new NormalDynamicContainerComponent(parent))
defineWidget('none', (parent: WidgetComponent) => new NoneWidget(parent))

class NormalDynamicContainerComponent extends DynamicContainerComponent {
    proxySchema(wcd: Record<string, any>) {
        return wcd
    }

    render(): VNodeChild {
        return <div>
            <el-button onClick={() => {
                this.addOne()
            }}>add one
            </el-button>
            <el-button onClick={() => {
                this.remoteTheLast()
            }}>remove the last
            </el-button>
            <el-button onClick={() => {
                this.clearAll()
            }}>clear
            </el-button>
            {this.subviews()}
        </div>;
    }

    addOne() {
        this.addSubComponent()
    }

    remoteTheLast() {
        this.spliceSubComponents(this.getSubcomponentNumber() - 1, 1)
    }

    clearAll() {
        this.clearSubComponents()
    }
}

/**
 * @note Please take this into consideration:
 *       If necessary to keep the meaningless component?
 * @todo remove this useless component
 */
class NoneWidget extends BasicComponent {

    render(): VNodeChild {
        return null
    }
}

