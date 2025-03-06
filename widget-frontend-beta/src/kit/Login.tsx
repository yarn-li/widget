import {ContainerComponent, defineWidget, internation, WidgetAccessor} from "@widget-frontend/widget-frontend-core";
import {VNodeChild} from "@vue/runtime-core";
import "../style-css/login.css"

export class Login extends ContainerComponent {
    private _accessor: WidgetAccessor = null
    override componentCreated() {
        super.componentCreated();
        this._accessor = this.getVueViewDriver().access(this)
    }

     async logOn() {
        await this.executeScripts(this._accessor.getOptions()['loginScripts'])
         setTimeout(() => {
             window.location.reload()
         }, 500)
    }

    render(): VNodeChild {
        return <div class={'w-login-page'}>
            <div class='w-login-bg' style={{'background-image': `url(${''})`}}>
                <div class="w-login-form right">
                    {
                        this.subviews().map((node) => {
                            if (node) {
                                return <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
                                    {
                                        node
                                    }
                                </div>
                            }
                            return null
                        })
                    }
                    <div class='buttonBox'>
                        <el-button type="primary" onClick={() => this.logOn()}>{internation.translate('widget.login', '登录')}</el-button>
                    </div>
                </div>
            </div>
        </div>
    }

}

defineWidget('login', (parent) => new Login(parent))