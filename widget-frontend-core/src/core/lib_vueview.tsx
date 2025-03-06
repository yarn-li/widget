import {defineComponent, onBeforeMount, onMounted, onUnmounted, onUpdated, reactive, ref, watch, nextTick} from "vue";
import {collectWidgetSource, VueViewDriver} from "./lib_view.ts";
import {WidgetContextObject} from "./lib_widget.ts";
import {Highway} from "../libs/highway.ts";
import {exists, uuid} from "../utils/functools.ts";
import "./index.css"
import DebugModal from "./DebugModal.vue";
import { mbus } from "./bus.ts"
import Cover from "./Cover.vue"
import {LoadingService} from "../libs/loading.ts";
import { internation } from "../ext/internationalization.ts";
const ENV = import.meta.env


class LayerStackManager {
    private _dbus: Highway = new Highway;
    addEventListener(event: string, callback: (...args) => void)
    { this._dbus.subscribe(event, callback) }
    init(schema: Record<string, any>) {
        const id = uuid()
        this._dbus.emit('pushLayer', {type: 'widget', name: 'widget', id, data: schema})
        return id
    }
    createDialog(context: Record<string, any>) {
        this._dbus.emit('pushLayer', context)
    }
    remove(id: string) { 
        this._dbus.emit('popLayer', id) 
    }

}


export const LayerView = defineComponent({
    props: ['schema', 'parameters'],
    setup(props, {emit}) {
        const states = reactive({hashcode: ''})
        let vvd: VueViewDriver;
        const openApiManager = WidgetContextObject.build(props.schema)
        openApiManager.validateWidgetComponent(props.parameters)
        vvd = new VueViewDriver(openApiManager.getTreeView(), openApiManager)
        onMounted(() => {
            try {
                vvd.build()
                nextTick(() => {
                    emit('buildComplete', true)
                })
            } catch (error) {
                console.error(error);
            }
            vvd.addEventListener('updateView', code => states.hashcode = code) 
        })
        onUnmounted(() => {
            if (vvd.vrd().buildComplete) {
                vvd.destroy()
            }
        })
        return () => {
            return <div class={`widget-layer-view layer-view__${states.hashcode}` }>{ vvd?.render() }</div>
        }
    }
})


const Layer = defineComponent({
    props: ['context', 'parameters'],
    setup(props, {emit}) {
        const buildLayer = (context) => {
            if (context.type === 'dialog') {
                return <Cover name={props.context.id}>
                    <LayerView class="widget-view-dialog" schema={props.context.data} onBuildComplete={(state) => {emit('buildComplete', state)}}/>
                </Cover>
            }  else if (context.type === 'x-dialog-print') {
                return <div class={'x-dialog-print'} style="width: 80%; max-height: 90%; position: relative; display: flex; z-index: -1; opacity: 0">
                    <LayerView schema={props.context.data} onBuildComplete={(state) => {emit('buildComplete', state)}}/>
                </div>
            } else {
                return <LayerView schema={props.context.data} parameters={props.parameters} onBuildComplete={(state) => {emit('buildComplete', state)}}/>

            }
        }
        return () => buildLayer(props.context)
    }
})


export const WidgetView = defineComponent({
    props: ['schema', 'parameters', 'data', 'auth-control'],
    provide() {
        return {
            authControl: this.authControl === true ? true : false
        }
    },
    setup(props, {emit}) {
        const manager = new LayerStackManager();

        const dr = reactive({layers: [/* { type, name, id, data } */]})

        onMounted(() => {
            const loading = new LoadingService({global: true, target: `.widget-view`, text: internation.translate('widget.dataLoading', '加载中'), mask: true})
            loading.showLoading()
            mbus.subscribe("pushLayer", context => {
                manager.createDialog(context)
            })

            mbus.subscribe("popLayer", id => {
                manager.remove(id)
            })

            manager.addEventListener('pushLayer', context => dr.layers.push(context))
            manager.addEventListener('popLayer', id => {
                mbus.emit(`fadeOut::${id}`)
                setTimeout(() => {
                    const idx = dr.layers.findIndex(context => context.id === id)
                    if (idx > -1) dr.layers.splice(idx, 1)
                }, 500)
            }
            )
            const schema = props.schema
            if(exists(schema, 'entry') && exists(schema['entry'], 'widgetType')) {
                schema.entry.widgetType.default = props.data
                if (exists(schema.entry.schema, 'x-widgetType')) {
                    schema.entry.schema['x-widgetType'].default = props.data
                }
            }
            manager.init(schema)
            loading.closeLoading()
        })

        watch(() => props.schema, (val) => {
            dr.layers = []
            manager.init(val)
        })

        return () => <div class="widget-view">
            {
                dr.layers.map((layer, idx) => {
                    return <Layer key={layer.id} context={layer} style={`z-index: ${idx}`} parameters={props.parameters} onBuildComplete={(state) => {emit('buildComplete', state)}}/>
                })
            }
            {
                dr.layers.length > 0 && ENV.MODE === 'test' ? <DebugModal schema={dr.layers[0].data} onRefresh={(data) => {dr.layers = [];manager.init(data)}}></DebugModal> : null
            }
        </div>
    }
})









