import { reactive, watch ,ref} from "vue";
import { WidgetComponent, BasicComponent, WidgetAccessor, defineWidget } from "../../openapiwidget/lib_view.ts";
import BaseFromItem from "./form-item/index.vue"
import { showToast } from 'vant';

/**
 * The WidgetComponent definition
 */
export class Select extends BasicComponent {
    /** Represent value */
    private _state: Record<string, any>;
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    // 
    private _actions=ref([]);
    private _show=ref(false ) 

    // ------------------------------------------------------
    override componentCreated() {
        this._accessor = this._vvd.access(this)
        const label = this._accessor.getLabel()
        this._state = reactive({ value: this.dumpsValueState() })
        watch(() => this._state.value, (newValue, oldValue) => {
            // console.info("watch old value :", oldValue, " new value :", newValue)

            // Todo: Here, drive rcd!      
            this.setValueState(newValue)
        })
        super.componentMounted()
        this.manageActions()
    }
    
    // ------------------------------------------------------
    /** listen value change triggered by component linkage */
    override handleValueChange(value: any) {
        // Todo: Here, update view's value!
        this._state.value = value
    }
    // 整合选项字段
    public manageActions = () => {
        const options = this._accessor.getOptions().options
        for (let index = 0; index < options.length; index++) {
            const item = options[index];
            this._actions.value.push({name:item.label,value:item.value})
        }
    }
    // 选择效果
    public onSelect = (item) => {
        this._show.value = false;
        showToast(item.name);
        this.setValueState(item.value)
      };
    //   关闭弹框
    public showModel = ()=>{
        this._show.value = true;
    }

    /** The core render function */
    override render() {
        if(!this._accessor.getVisible()) return null
        return <div>
        <van-cell is-link title={this._accessor.getLabel()} onClick={this.showModel}></van-cell>
        <van-action-sheet
            v-model:show={this._show.value}
            actions={this._actions.value}
            onSelect={this.onSelect}
            close-on-click-action
        />
    </div>
    }
}

defineWidget('select', (parent: WidgetComponent) => new Select(parent))