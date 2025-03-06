import {
    BasicComponent,
    ContainerComponent,
    defineBuiltin,
    DynamicContainerComponent,
    WidgetAccessor,
    WidgetComponent,
    mbus,
    clone,
    exists,
    uuid, WidgetContextObject, VueViewDriver, internation
} from "@widget-frontend/widget-frontend-core"
import { ElMessage, ElMessageBox } from "element-plus"
import {LoadingService} from "../../../widget-frontend-core/src/libs/loading.ts"
const dialogContentSchema = (schema: Record<string, any>, widgetType: Record<string, any>, id: string, defaultData: any) => {
    return {
        "type": "object",
        "properties": {
            "dialog": {
                "type": "object",
                "properties": {
                    "main": {
                        ...schema
                    }
                },
                "x-properties": {
                    "main": {
                        ...schema,
                        ...widgetType,
                        default: defaultData,
                        widget: {...widgetType.widget, ...widgetType},
                        "x-widgetType": widgetType
                    }
                }
            }
        },
        "x-properties": {
            "dialog": {
                "widget": {
                    "type": "dialog",
                    "options": {
                        id
                    }
                }
            }
        }
    }
}

function clearEventListener(id: string) {
    mbus.unsubscribe(`confirm::${id}`)
    mbus.unsubscribe(`cancel::${id}`)
    mbus.unsubscribe(`close::${id}`)
}

export function openDialog(com: ContainerComponent, xpath: string, data: any, widgetType?: Record<string, any>, preFunction?: Function | null) {
    return new Promise((resolve) => {
        const id = uuid()
        let wcd: WidgetAccessor
        const originSchema = clone(com.getVueViewDriver().OpenApiManager.getSchema())
        
        const dialogMainSchema = com.getSubcomponent(com.xpath() + xpath)

        if(dialogMainSchema === null) {
            const originSchema = com.getVueViewDriver().OpenApiManager.getComponents().get(`#/components/schemas/${xpath}`)
            if (!originSchema) {
                throw new Error(`con not find $ref #/components/schemas/${xpath}`)
            }
            wcd = WidgetAccessor.access(originSchema)
        } else {
            wcd = WidgetAccessor.access(com.getVueViewDriver().wcd(dialogMainSchema.uuid()))
        }
        if (!widgetType) {
            if (wcd.getXWidgetType()){
                widgetType = wcd.getXWidgetType()
            } else {
                throw new Error(`#/components/schemas/${xpath} lack of x-widgetType`);
            }
        }
        const newSchema = {entry: {schema: dialogContentSchema(wcd.getWcd(), widgetType, id, data)}, components: originSchema.components, paths: originSchema.paths }

        mbus.emit('pushLayer', {type: 'dialog', name: 'dialog', id, data: newSchema})
        
        mbus.subscribe(`close::${id}`, async(finalData, dialog) => {
            const status = typeof preFunction === 'function' ? await preFunction(finalData) : true
            if (status) {
                resolve(finalData)
                mbus.emit('popLayer', id)
                clearEventListener(id)
            }
        })
    
        mbus.subscribe(`confirm::${id}`, async(finalData, dialog) => {
            const status = typeof preFunction === 'function' ? await preFunction(finalData) : true
            if (status) {
                resolve(finalData)
                mbus.emit('popLayer', id)
                clearEventListener(id)
            }
        })
    
        mbus.subscribe(`cancel::${id}`, async(finalData, dialog) => {
            const status = typeof preFunction === 'function' ? await preFunction(finalData) : true
            if (status) {
                resolve(finalData)
                mbus.emit('popLayer', id)
                clearEventListener(id)
            }
        })
    })
}

export function message(type: string, info: string) {
    ElMessage[type]({
        message: internation.translate(info)
    })
}

export function update(com: WidgetComponent, xpath: string, value: any) {
    let component
    if (xpath !== '' && xpath !== null) {
        component = (com as ContainerComponent).getChildren().find(ele => ele.xpath() === com.xpath() + '/' +  xpath)
        if (!component) {
            throw new Error(`${com.xpath()} not exist ${xpath}`)
        }
    } else {
        component = com
    }
   if (component instanceof DynamicContainerComponent) {
        (component as any).reload(value)
   } else if (component instanceof ContainerComponent) {
       const wcd = component.getVueViewDriver().access(component)
       Object.keys(wcd.getProperties()).forEach(key => {
           update(component, key, value[key])
       })
   } else if(component instanceof BasicComponent) {
        const wcd = com.getVueViewDriver().wcd(component.uuid())

        // We can't invoke setValueState here, because setValueState will trigger components linkage!
        component.setValueState(value)
        component.handleValueChange(value)
   }
}

export function setOptions(com: WidgetComponent, xpath: string, name: string, value: any) {
    let component;
    if(xpath && xpath !== '') {
        component = (com as ContainerComponent).getSubcomponent(xpath.split('.').join('/')) as BasicComponent
    } else {
        component = com
    }
    const wcd = component.getVueViewDriver().wcd(component.uuid())
    if (exists(wcd['widget'], 'options')) {
        wcd['widget']['options'][name] = value
    } else {
        const options = {}
        options[name] = value
        wcd['widget']['options'] = options
    }
}

export function getOptions(com: WidgetComponent, xpath: string, name: string) {
    let component;
    if(xpath && xpath !== '') {
        component = (com as ContainerComponent).getSubcomponent(xpath.split('.').join('/')) as BasicComponent
    } else {
        component = com
    }
    const wcd = component.getVueViewDriver().wcd(component.uuid())
    if (exists(wcd['widget'], 'options')) {
        return  wcd['widget']['options'][name]
    } else {
        return null
    }
}

defineBuiltin("dump", (com: ContainerComponent) => {
    return com.dumpsValueState()
})

defineBuiltin("dumpWidthValidate", (com: ContainerComponent) => {
    if (com.validate()) {
        return com.dumpsValueState()
    }
    throw new Error('data validate not pass')
})
defineBuiltin("openDialog", (com: ContainerComponent, ...args) => openDialog(com, args[0], args[1], args[2], args[3]))

defineBuiltin("message", (com: WidgetComponent, ...args) => message(args[0], args[1]))

defineBuiltin("update", (com: WidgetComponent, ...args) => update(com, args[0], args[1]))

defineBuiltin('validate', (com: WidgetComponent) => {
    return com.validate()
})

const handle = {
    value: {
        set: (com: WidgetComponent, path: string, value: any) => {
            const realCom = (com as ContainerComponent).getSubcomponent(path.split('.').join('/')) as BasicComponent
            const wcd = realCom.getVueViewDriver().wcd(realCom.uuid())
            realCom.setValueState(value)
            realCom.handleValueChange(value)
        },
        get: (com: WidgetComponent) => { return com.dumpsValueState() }
    },
    visible:{
        set: (com: WidgetComponent, path: string, value: any) => {
            const realCom = (com as ContainerComponent).getSubcomponent(path.split('.').join('/'))
            realCom.getVueViewDriver().wcd(realCom.uuid())['visible'] = value
        },
        get: (com: WidgetComponent) => { return WidgetAccessor.access(com.getVueViewDriver().wcd(com.uuid())).getVisible() }
    },
    editable: {
        set: (com: WidgetComponent, path: string, value: any) => {
            const realCom = (com as ContainerComponent).getSubcomponent(path.split('.').join('/'))
            realCom.getVueViewDriver().wcd(realCom.uuid())['widget']['editable'] = value
        },
        get: (com: WidgetComponent) => { return WidgetAccessor.access(com.getVueViewDriver().wcd(com.uuid())).getVisible() }
    }
}

defineBuiltin('get', (com: WidgetComponent, ...args) => {
    const xpath = args[0]
    const realCom = (com as ContainerComponent).getSubcomponent(xpath.split('.').join('/')) as BasicComponent
    if (!realCom)
        throw new Error(`${com.xpath()} not exist ${xpath}`)
    const keyName = args[1]
    return handle[keyName].get(realCom)
})

defineBuiltin('set', (com: WidgetComponent, ...args) => {
    const path = args[0]
    const keyName = args[1]
    const value = args[2]
    handle[keyName].set(com, path, value)
})

defineBuiltin('setOptions', (com: WidgetComponent, ...args) => setOptions(com, args[0], args[1], args[2]))
defineBuiltin('getOptions', (com: WidgetComponent, ...args) => getOptions(com, args[0], args[1]))
defineBuiltin('scope', (com: WidgetComponent) => com.dumpsValueState())
defineBuiltin('getProperty', (com, ...args) => {
    const path = args[0]
    const name = args[1]
    let realCom = null
    if(path && path !== '') {
        realCom = (com as ContainerComponent).getSubcomponent(path.split('.').join('/'))
    } else {
        realCom = com
    }

    return realCom.getProperty(name)
})

defineBuiltin('setProperty', (com, ...args) => {
    const path = args[0]
    const name = args[1]
    let realCom = null
    if(path && path !== '') {
       realCom = (com as ContainerComponent).getSubcomponent(path.split('.').join('/'))
    } else {
        realCom = com
    }
    if (!realCom[name]) {
        throw new Error(`base-scene do not have private property ${name}`)
    }
    const value = args[2]
    return realCom.setProperty(name, value)
})

// table
defineBuiltin('getValueByWidgetType', (com, ...args) => {
    const widgetType = args[0]
    const value = com.dumpsValueState()
    const wcd = com.getVueViewDriver().access(com)
    const data = {}
    Object.keys(wcd.getXProperties()).forEach(key => {
        if (WidgetAccessor.access(wcd.getXProperties()[key]).getWidgetComponentType() === widgetType) {
            data[key] = value[key]
        }
    })
    if (Object.keys(data).length === 0) {
        return null
    } else if (Object.keys(data).length === 1) {
        return Object.values(data).join('')
    } else if(Object.keys(data).length > 0){
        return data
    }
})

defineBuiltin('getKeyByWidgetType', (com, ...args) => {
    const widgetType = args[0]
    const value = com.dumpsValueState()
    const wcd = com.getVueViewDriver().access(com)
    const data = []
    Object.keys(wcd.getXProperties()).forEach(key => {
        if (WidgetAccessor.access(wcd.getXProperties()[key]).getWidgetComponentType() === widgetType) {
            data.push(key)
        }
    })
    if (data.length === 0) {
        return null
    } else if (data.length === 1) {
        return data.pop()
    } else if(data.length > 0){
        return data
    }
})

defineBuiltin('getIdData', (com, ...args) => {
    const widgetType = 'id'
    const value = com.dumpsValueState()
    const wcd = com.getVueViewDriver().access(com)
    const data = {}
    Object.keys(wcd.getXProperties()).forEach(key => {
        if (WidgetAccessor.access(wcd.getXProperties()[key]).getWidgetComponentType() === widgetType) {
            data[key] = value[key]
        }
    })
    if (Object.keys(data).length === 0) {
        return null
    } else if (Object.keys(data).length === 1) {
        return Object.values(data).join('')
    } else if(Object.keys(data).length > 0){
        return data
    }
})

// @todo 覆盖了原生的call，后续改掉函数名称
defineBuiltin('call', (com, ...args) => {
    const funcName = args[0]
    const funcArgs = args.slice(1)
    return com[funcName](...funcArgs)
})

defineBuiltin('messageBox', (com, ...args) => {
    const message = args[0]
    const title = args[1] ? internation.translate(args[1]) : internation.translate('widget.tip' ,'提示')
    return new Promise((resolve, reject) => {
        ElMessageBox.confirm(internation.translate(message), title, {
            confirmButtonText: internation.translate('widget.confirm', '确认'),
            cancelButtonText: internation.translate('widget.cancel', '取消'),
            type: 'warning'
        }).then(() => {
            resolve(true)
        }).catch(() => {
            resolve(false)
        })
    })
})

let loading: LoadingService = null
let timer = null
// 开启加载遮罩
const showLoading = (loadingText: string = internation.translate('widget.dataLoading', '数据加载中')) => {
    if (loading !== null) {
        loading.closeLoading()
        loading = null
    }
    loading = new LoadingService({global: false, target: `.widget-view`,background: 'rgba(255, 255, 255, 0.7)', text: loadingText, mask: true})
    timer = setTimeout(() => {
        loading.showLoading()
    }, 200)
}

// 关闭加载遮罩
defineBuiltin('openLoading', (com, ...args) => {showLoading(args[0])})
const closeLoading = () => {
    if (timer) {
        clearTimeout(timer)
    } else {
        loading.closeLoading()
        loading = null
    }
    timer = null
}

defineBuiltin('closeLoading', () => {closeLoading()})

defineBuiltin('triggerEvent', (com, ...args) => {
    const xpath = args[0]
    const eventName = args[1]
    let target;
    if (xpath && xpath !== '') {
        target = (com as ContainerComponent).getSubcomponent(xpath.split('.').join('/'))
    } else {
        target = com
    }
    target.emit(eventName)
})

