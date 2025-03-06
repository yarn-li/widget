import {
    ContainerComponent,
    WidgetComponent,
    defineWidget,
    mbus,
    internation
} from "@widget-frontend/widget-frontend-core";
import { CloseBold } from '@element-plus/icons-vue'
import "../style-css/dialog-container.css"
import {LoadingService} from "@widget-frontend/widget-frontend-luna"

let loading: LoadingService = null
let timer = null
// 开启加载遮罩
const showLoading = (loadingText: string = internation.translate('widget.dataLoading', '数据加载中')) => {
    loading = new LoadingService({global: false, target: `.widget-view`, text: loadingText, mask: true})
    loading.showLoading()
}

// 关闭加载遮罩
const closeLoading = () => {
    if (timer) {
        clearTimeout(timer)
    } else {
        loading.closeLoading()
        loading = null
    }
    timer = null
}

export class Dialog extends ContainerComponent {

    getMainData() {
        return this.dumpsValueState().main
    }

    async confirm() {
        showLoading('校验数据中')
        const valid = await this.validate()
        closeLoading()
        if (valid)
            mbus.publish(`confirm::${this._vvd.access(this).getOptions().id}`, {
                action: "confirm",
                data: this.getMainData()
            }, this.getSubcomponent('main'))
    }

    render() {
        return <div class={`dialog-container`}>
        <div class="dialog-container-header">
            <h3 class="dialog-container-header__title">{}</h3>{' '}
            <div
                class="dialog-container-header__icon"
                onClick={() => {
                    mbus.publish(`close::${this._vvd.access(this).getOptions().id}`, {
                        action: "close",
                        data: this.getMainData()
                    }, this);
                }}
            >
                <el-icon>
                    <CloseBold />
                </el-icon>
            </div>
        </div>
        <div class="dialog-container-line"></div>
        <div class="dialog-container-main">
            {this.subviews()}
        </div>
        <div class="dialog-container-footer">
            <el-button
                style="width: 120px"
                type="primary"
                size="default"
                onClick={async () => {
                  await this.confirm()
                }}
            >
                {internation.translate('widget.confirm', '确认')}
            </el-button>
            <div style="flex-shark: 0; width: 60px"></div>
            <el-button
                style="width: 120px"
                type="primary"
                plain
                size="default"
                onClick={() => {
                    mbus.publish(`cancel::${this._vvd.access(this).getOptions().id}`, {
                        action: "cancel",
                        data: this.getMainData()
                    }, this);
                }}
            >
                {internation.translate('widget.cancel', '取消')}
            </el-button>
        </div>
    </div>
    }
}

defineWidget('dialog' , (parent: WidgetComponent) => new Dialog(parent))