// @author: jun.dai
import {reactive} from "vue";
import {VNodeChild} from "@vue/runtime-core";
import {extendedTraverse, mbus, WidgetContextObject} from "./lib_widget.ts";
import {clone, exists, hash, uuid} from "../utils/functools.ts";
import {AsynchronousExecutor} from "./sandbox.ts";
import {dumpsValue} from "./lib_openapi.ts";
import {DSTree, TreeNode} from "./dstree.ts";
import {Highway} from "../libs/highway.ts";
import {internation} from "../ext/internationalization.ts";

export function collectWidgetSource(schema: any, componentType: Array<string>) {
    const openApiManager = WidgetContextObject.build(schema)
    openApiManager.validateWidgetComponent()
    const vvd = new VueViewDriver(openApiManager.getTreeView(), openApiManager)

    const initSchema = (schema: any, widgetType: any) => {
        const widgetObj = widgetType ? widgetType : {
            widget: {
                "type": "page"
            }
        }
        let newSchema = {
            "type": "object",
            "properties": {
                "page": schema
            },
            "x-properties": {
                "page": widgetObj
            }
        }
        return newSchema
    }

    const entrySchema = initSchema(schema.entry.schema, schema.entry.widgetType)
    const sources = []
    const params = []

    if(!exists(schema['info'], 'x-id')) {
        throw new Error('schema info lack of x-id')
    }
    extendedInterface(schema.paths, schema['info']['x-id'],(path) => {
        sources.push(path)
    })
    extendedSchema(entrySchema, openApiManager.getComponents(), '', schema['info']['x-id'],(paths: Array<string>) => {
        sources.push(...paths)
    }, componentType)
    extendedParameters(schema.entry.parameters, schema.entry.schema, openApiManager.getComponents(), (param) => {
        params.push(param)
    })
    return {sources, params}
}

function extendedParameters(parameters: Array<any>, schema: any, referenced, callback) {
    if(!parameters) return []
    parameters.forEach(param => {
        const path = param.target.replace('$.', '')
        const targetSchema = querySchema(schema, referenced, path)
        callback({
            name: param.name,
            required: param.required,
            schema: {
                type: targetSchema.type
            },
        })

    })
}

const methods: Array<string> = ['get', 'post', 'put', 'delete']

function extendedInterface(paths, resourceId, callback) {
    Object.keys(paths).forEach((key => {
        const request = paths[key]
        Object.keys(request).forEach((method: string) => {
            if (methods.includes(method)) {
                callback({
                    "permType": "INTERFACE",
                    "perm": resourceId + '_' + key + '_' + method,
                    "remark": request.description,
                    "children": []
                })
            }
        })
    }))
}

function querySchema(schema, referenced, path) {
    if (exists(schema, '$ref')) {
        const reference = schema['$ref']
        schema = {...referenced.get(reference), ...schema['widgetType']}
    }
    if (path === '') {
        return schema
    }
    const type = schema.type
    if (type === 'object') {
        const paths = path.split('.')
        const key = paths.shift()
        const targetSchema = exists(schema['properties'], key) ? schema['properties'][key] : {}
        return querySchema(targetSchema, referenced, paths.join('.'))
    } else if (type === 'array') {
        return querySchema({...schema.items, ...schema['x-items']}, referenced, path)
    } else {
        return null
    }

}

function extendedSchema(schema: any, referenced: Map<string, any>, path: string, resourceId: string, callback, componentType: Array<string> = null) {
    if (exists(schema, '$ref')) {
        const reference = schema['$ref']
        schema = {...referenced.get(reference), ...schema['widgetType']}
    }
    const type = schema.type
    if (type === 'object') {
        if (exists(schema, 'widget')) {
            const _widget = RegisteredMetaWidgets.get(schema.widget.type)
            const widget = _widget(null)
            if (!componentType || compareToType(schema, componentType)) {
                callback([{
                    "permType": "ELEMENT",
                    "perm": path,
                    "remark": schema.label,
                    "children": []
                }])
            }
            const sourcesId = widget?.collectSources ? widget.collectSources(schema, resourceId) : []
            callback(sourcesId)
        }
        Object.keys(schema.properties).forEach((key: string) => {
            extendedSchema({...schema.properties[key], ...schema['x-properties'][key]}, referenced, `${path !== '' ? `${path}/` : ''}${key}`, resourceId, callback, componentType)
        })
    } else if (type === 'array') {
        extendedSchema({...schema.items, ...schema['x-items']}, referenced, path, resourceId, callback, componentType)
    } else {
        if (!componentType || compareToType(schema, componentType)) {
            callback([{
                "permType": "ELEMENT",
                "perm": path,
                "remark": schema.label,
                "children": []
            }])
        }
    }
}

function compareToType(schema: any, componentType: Array<string>) {
    const widgetType = exists(schema, 'widget') ? schema.widget.type : null
    return componentType.includes(widgetType)
}


function traverse(node: WidgetComponent, validate: any, callBack) {
    if (validate.valid) return
    if (exists(validate, 'properties')) {
        Object.keys(validate['properties']).forEach(key => {
            const childNode = (node as ContainerComponent).getSubcomponent(key)
            traverse(childNode, validate['properties'][key], callBack)
        })
    } else if (exists(validate, 'items')) {
        validate['items'].forEach((item, i: number) => {
            traverse(node.getChildren()[i], item, callBack)
        })
    } else {
        callBack(node, validate)
    }
}

/**
 * @class SmartProbe
 * Pry into WIDGET framework, for best testing.
 */
class SmartProbe {
    private static _self: SmartProbe = null
    private _info: Record<string, any> = {}

    private constructor() {
    }

    static get() {
        if (SmartProbe._self === null)
            SmartProbe._self = new SmartProbe()
        return SmartProbe._self
    }

    info() {
        return this._info
    }
}

/** Global unique SmartProbe instance. */
export interface TraitSmartProbe {
    probe: SmartProbe;
}

declare global {
    interface Window extends TraitSmartProbe {
    }
}
window.probe = SmartProbe.get()

/** click trait */
export interface WidgetEventClick {
    click(): void;
}

/**
 * The template object represent the type of WidgetComponent.
 * All functions provided by TemplateObject is to solve the
 * real requirements!
 * @todo the specific functions
 */
export class TemplateObject {

    private _components: Map<string, WidgetComponent> = new Map;

    /**
     * Add a component belongs to the template object.
     * The method will be invoked by the framework.
     * @param hd the handle of the component, xpath/uuid maybe!
     * @param component widget component instance
     */
    addComponent(hd: string, component: WidgetComponent) {
        this._components.set(hd, component)
        return this
    }

    /**
     * Remove the related component from the template object.
     * @param hd the specific handle of a component instance.
     * @note don't forget to remove the component from
     *       template object after unmounting the component.
     */
    removeComponent(hd: string) {
        this._components.delete(hd)
        return this
    }

    /**
     * The method is an example, please don't invoke it!
     * @todo remote it! Maybe!
     */
    setOptionAttribute(key: string, value: any) {
        for (const component of this._components) {
            // todo: add implementation here if necessary.
        }
    }
}

/**
 * Base class of all widget components.
 * WidgetComponent provides many basic functions for component
 * which is inherited from its. Such as:
 *   1. search parent and children
 *   2. responsive data driving
 *   3. view fresh
 */
export abstract class WidgetComponent {
    /**
     * Widget component needs vvd to update view if
     * any necessary actions are triggered.
     */
    protected _vvd: VueViewDriver = null;
    protected _templateObject: TemplateObject = null;
    /**
     * Prepared for binding events.(Not only events binding!)
     * About xpath, we are supposed to provide more advanced methods, used for
     *   1. component indexing
     *   2. schema indexing
     *   3. subcomponent indexing
     */
    protected _xpath: string = '';
    /**
     * Maintain the parent-children relation.
     */
    protected _parent: WidgetComponent = null;
    protected _children: WidgetComponent[] = [];
    /**
     * The unique id of the current widget component.
     * @note Readonly attribute! If conflict occurred, use this uuid first.
     *       Especially "_uuid" in "widget".
     */
    private readonly _uuid: string;

    /**
     * Construct a WidgetComponent
     * @todo wcd should be hidden further.
     *       Component developing should not see all JSON schema.
     *       Abstractly, only "widget" can be seen.
     */
    constructor(parent: WidgetComponent = null) {
        this._uuid = uuid()
        this._parent = parent
    }

    /**
     * Set vvd
     */
    setVueViewDriver(vvd: VueViewDriver) {
        this._vvd = vvd
        return this
    }

    /**
     * Get vvd
     * Need to hide the method in the future.
     */
    getVueViewDriver() {
        return this._vvd
    }

    /**
     * The template object provided by the framework.
     * Please don't invoke the method manually!
     */
    setTemplateObject(t: TemplateObject) {
        this._templateObject = t;
        return this
    }

    /**
     * Get the handle of template object which
     * the current widget component belongs to.
     */
    getTemplateObject() {
        return this._templateObject
    }

    // /**
    //  * The schema of component is wcd(widget context data).
    //  * However, we still don't hope expose schema/wcd of component.
    //  * Several places need this method. At current stage, keep this!
    //  * @todo as above
    //  * @deprecated Please use vvd.wcd(uuid)!
    //  */
    // getSchema() {
    //     return this._vvd.wcd(this.uuid())
    // }
    /** Get component uuid. */
    uuid() {
        return this._uuid
    }

    /** Get parent component of the current instance. */
    parent(): WidgetComponent {
        return this._parent
    }

    /**
     * Get subcomponents.
     * We should think about if necessary to expose subcomponents to outside.
     */
    getChildren() {
        return this._children
    }

    removeChild(uuid: string) {
        let index = -1
        for (let i = 0; i < this._children.length; i++) {
            if (uuid === this._children[i]._uuid) {
                index = i
                break
            }
        }
        if (index !== -1)
            this._children.splice(index, 1)
    }

    /**
     * Root component's dynamic getting.
     * @note The method is inefficient. Use it just for test.
     * @deprecated useless method!
     * VueViewDriver hold the "_topWidget" as replacement.
     */
    root(): WidgetComponent {
        let _container: WidgetComponent = this
        while (true) {
            if (_container.parent() === null)
                break
            _container = _container.parent()
        }
        return _container
    }

    /** set xpath */
    setXpath(s: string) {
        this._xpath = s;
        return this
    }

    /** Get the xpath of the instance. */
    xpath() {
        return this._xpath
    }

    /** For event binding usage */
    xpathOfGeneric() {
        return this._xpath
            .replaceAll(/\[-?\d+]/g, '')
            .replaceAll('/', '.')
    }

    /** Build the relation between parent and the current instance. */
    setParent(p: WidgetComponent) {
        if (p === null) return this
        this._parent = p
        if (this._parent._children.indexOf(this) === -1)
            this._parent._children.push(this)
        return this
    }

    /** Pick up every OpenApi node data and format with JSON. */
    dumpsValueState() {
        return dumpsValue(this._vvd.wcd(this.uuid()))
    }

    /**
     * componentCreated: One of life cycle functions
     * Be invoked after creating the widget component instance.
     */
    componentCreated(): void { /* default empty implementation */
    }

    /**
     * componentMounted: One of life cycle functions
     * Be invoked after mounting the instance.
     * @note The method has nothing to do with "onMounted" of Vue component.
     */
    componentMounted(): void { /* default empty implementation */
    }

    componentUpdated(): void {
    }

    /**
     * componentBeforeDestroy: One of life cycle functions
     * Be invoked before destroying the instance.
     */
    componentBeforeDestroy(): void {
    }

    // /**
    //  * OpenApi data(widget part) validation
    //  */
    // validate(data: Record<string, any>): boolean { return true };
    // /**
    //  * Data driver: wcd(Widget Context Data) change listener
    //  * The change may come from "linkage", "event" or "userspace functions".
    //  */
    // handleContextChange(wcd: Record<string, any>): void {}
    /**
     * View update
     * As you know, structure changing will drive view update!
     * vvd(Vue View Driver) will update tree view in proper time.
     * You can view the method as "Force Update".
     */
    updateView(): void {
        if (this._vvd !== null)
            this._vvd.updateView()
    }

    /** View rendering */
    abstract render(): VNodeChild;

    /** Emit event */
    emit(event: string, ...args: any[]) {
        const topic = `uuid:${this.uuid()};event:${event}`
        mbus.publish(topic, ...args)
    }

    /** linkage among the components */
    linkage() {
        let _container = this.parent()
        while (_container !== null) {
            if (isContainerComponent(_container)) {
                (_container as ContainerComponent).linkage()
            }
            _container = _container.parent()
        }
        return this
    }

    /**
     * Binding events by using containers' "bindScripts" method.
     * @note inject necessary scope(from container) into userspace.
     */
    bindEvents() {
        if (this.xpath() === '') return this
        let _container = this.parent()
        while (_container !== null) {
            if (isContainerComponent(_container))
                (_container as ContainerComponent).bindScripts(this)
            _container = _container.parent()
        }
        return this
    }

    /** Computing structure from the current instance. */
    structure() {
        const compute = (root: WidgetComponent) => {
            const stu: Record<string, any> = {uuid: root.uuid(), children: []}
            for (const child of root._children) {
                stu.children.push(compute(child))
            }
            return stu
        }
        return compute(this)
    }

    buildUserspaceAccessibleObjects() {
        const sandbox: Record<string, any> = {}
        RegisteredBuiltins.forEach((builtin, signature) => {
            sandbox[signature] = (...args) => {
                try {
                    return builtin(this, ...args)
                } catch (e) {
                    console.error(e)
                }
            }
        })
        return {...sandbox, ...this._vvd.OpenApiManager.getHttpFunctions()}
    }

    async validate(): Promise<boolean> {
        const wcd = this._vvd.wcd(this.uuid())
        const {type, widget} = wcd
        const value = this.dumpsValueState()
        let {_validates, required} = widget
        for (let i = 0; i < _validates.length; i++) {
            if (i === 0 && required && type === 'object') {
                for (const key in value) {
                    const property = value[key]
                    if (!_validates[i].validate(property)) {
                        this.setErrorMessage(_validates[i].message)
                        return false
                    }
                }
                continue
            }
            const that = this
            if (_validates[i].ruleType && _validates[i].ruleType === 'treeVerification') {
                const validateFunc = async (script: string) => {
                    try {
                        const data = await AsynchronousExecutor(this.buildUserspaceAccessibleObjects(), script)
                        return JSON.parse(data.entity)
                    } catch (e) {
                        console.error(e)
                    }
                }
                const valid = await _validates[i].validate(validateFunc)
                if (!valid.valid) {
                    try {
                        traverse(this, valid, (node, validated: { valid: boolean, message: string }) => {
                            if (!validated.valid) {
                                node.setErrorMessage(validated.message)
                            }
                            return validated.valid
                        })
                        return false
                    } catch (e) {
                        console.error(e)
                    }

                }
            }
            if (!_validates[i].validate(value)) {
                this.setErrorMessage(_validates[i].message)
                return false
            }
        }
        if (wcd._errorMessage !== '') {
            this.setErrorMessage("")
        }
        return true
    }

    /**
     * The unique way of driving errorMessage update.
     */
    setErrorMessage(message: string) {
        this._vvd?.OpenApiManager
            .setBasicComponentErrorMessage(this._vvd.wcd(this.uuid()), internation.translate(message))
    }

    collectSources(schema: any, resourceId: string) {return []}
}

/** Represent the minimal component of the Widget. */
export abstract class BasicComponent extends WidgetComponent {
    override componentCreated(): void {
        this.executeLifeTime('initialled')
    }

    override componentMounted() {
        this.executeLifeTime('mounted')
    }

    override componentUpdated() {
        this.executeLifeTime('updated')
    }

    override componentBeforeDestroy() {
        this.executeLifeTime('beforeDestroy')
    }

    /**
     * The unique way of driving data update.
     * After updating data, it will trigger "components linkage".
     */
    setValueState(value: any) {
        this._vvd?.OpenApiManager
            .setBasicComponentValue(this._vvd.wcd(this.uuid()), value)
        this._vvd.updatedComponent(this)
        this.linkage()
    }

    /** Override */
    handleValueChange(value: any): void {
    }

    getProperty(name: string) {
        if (Object.keys(this).includes(name)) {
            throw new Error(`do not provide data with this name ${name}`);
        }
        return this[name].value;
    }


    setProperty(name: string, data: any) {
        if (Object.keys(this).includes(name)) {
            throw new Error(`do not provide data with this name ${name}`);
        }
        this[name].value = data;
    }

    async executeScript(script: string, registerData: Record<string, any> = {}) {
        const data = {}
        Object.keys(registerData).forEach((key: string) => {
            if (typeof registerData[key] === "function") {
                data[key] = (...args) => {
                    try {
                        return registerData[key](this, ...args)
                    } catch (e) {
                        console.error(e)
                    }
                }
            } else {
                data[key] = registerData[key]
            }

        })
        try {
            return await AsynchronousExecutor(Object.assign(this.buildUserspaceAccessibleObjects(), data), script)
        } catch (e) {
            console.error(e)
        }
    }

    private executeLifeTime(name: string) {
        const wcd = this._vvd.wcd(this.uuid())
        const access = WidgetAccessor.access(wcd)
        const lifetime = access.getLifetime(name)
        for (const script of lifetime) {
            try {
                AsynchronousExecutor(this.buildUserspaceAccessibleObjects(), script).then()
            } catch (e) {
                console.error(e)
            }
        }
    }

}

/**
 * Represent the container component of Widget
 *
 * Only container component hold the virtual nodes!
 * If you want to wrap subcomponents, no matter how many,
 * you should create a container component!
 */
export abstract class ContainerComponent extends WidgetComponent {
    // /**
    //  * A container for collecting all VNodeChild.
    //  * It will be filled by framework.
    //  * The key is xpath of the component instance.
    //  * @note Don't operate this array by yourself, only for accessing!
    //  */
    // private _virtualChildren: Map<string, VNodeChild> = new Map;
    // /**
    //  * Clear all the last time VNodeChild
    //  * Avoid re-rendering!
    //  *
    //  * @note Vue will render the three view after reactive data were updated!
    //  *   Therefore, It's necessary to clear VNodeChild from _virtualChildren.
    //  *
    //  * @deprecated It's unnecessary to clear the Map! Not like the array,
    //  *   Map will not expand!
    //  */
    // clearVirtualChildren() {
    //     this._virtualChildren.clear()
    //     return this
    // }
    // /**
    //  * Add one VNodeChild
    //  *
    //  * @deprecated
    //  */
    // addVirtualChild(xpath: string, vc: VNodeChild) {
    //     // if (Array.from(this._virtualChildren.values()).indexOf(vc) !== -1)
    //     //     return this
    //     this._virtualChildren.set(xpath, vc)
    //     return this
    // }

    override componentCreated() {
        this.executeLifeTime('created')
    }

    override componentMounted() {
        this.executeLifeTime('mounted')
    }

    override componentUpdated() {
        this.executeLifeTime('updated')
    }

    override componentBeforeDestroy() {
        this.executeLifeTime('beforeDestroy')
    }

    executeLifeTime(name: string) {

        const wcd = this._vvd.wcd(this.uuid())
        const access = WidgetAccessor.access(wcd)
        const lifetime = access.getLifetime(name)
        for (const script of lifetime) {
            try {
                AsynchronousExecutor(this.buildUserspaceAccessibleObjects(), script).then()
            } catch (e) {
                console.error(e)
            }
        }
    }

    async executeScripts(scripts: Array<string>, registerData: Record<string, any> = {}) {
        const data = {}
        Object.keys(registerData).forEach((key: string) => {
            if (typeof registerData[key] === "function") {
                data[key] = (...args) => {
                    try {
                        return registerData[key](this, ...args)
                    } catch (e) {
                        console.error(e)
                    }
                }
            }
        })
        for (const script of scripts) {
            try {
                // console.log('script', script, Object.assign(this.buildUserspaceAccessibleObjects(), data));
                await AsynchronousExecutor(Object.assign(this.buildUserspaceAccessibleObjects(), data), script).then()
            } catch (e) {
                console.error(e)
            }
        }
    }

    async executeScript(script: string, registerData: Record<string, any> = {}) {
        const data = {}
        Object.keys(registerData).forEach((key: string) => {
            if (typeof registerData[key] === "function") {
                data[key] = (...args) => {
                    try {
                        return registerData[key](this, ...args)
                    } catch (e) {
                        console.error(e)
                    }
                }
            } else {
                data[key] = registerData[key]
            }

        })
        try {
            return await AsynchronousExecutor(Object.assign(this.buildUserspaceAccessibleObjects(), data), script)
        } catch (e) {
            console.error(e)
        }
    }

    override async validate() {
        let valid = true;

        for (let index = 0; index < this.getChildren().length; index++) {
            const childNode = this.getChildren()[index];
            const result = await childNode.validate()
            if (!result) {
                valid = false
            }
        }

        const validateSelf = await super.validate()

        return valid && validateSelf;
    }

    getSubcomponent(xpath: string): WidgetComponent {
        let subcomponent: WidgetComponent = null
        const _traverse = (_com: WidgetComponent, fx: (_com: WidgetComponent) => boolean) => {
            if (fx(_com)) return
            const children = _com.getChildren()
            for (const child of children) _traverse(child, fx)
        }
        _traverse(this, (_com) => {
            if (_com.xpath().endsWith(xpath)) {
                subcomponent = _com
                return true
            }
            return false
        })
        return subcomponent
    }

    /**
     * Grab all VNodeChild under the container
     * If you configured layout attribute, all VNodeChild
     * will be wrapped by a layout VNodeChild.
     */
    subviews(): VNodeChild[] {
        // return Array.from(this._virtualChildren.values())
        return Array.from(this.convertSubviewMap(this._vvd.getSubviewMap(this)).values())
        // return this.layoutVirtualChildren()
    }

    /**
     * Layout the subcomponents if necessary
     * @todo think about array items
     *       more tests! bug!!!
     */
    layoutVirtualChildren() {
        const xWidget = this._vvd.wcd(this.uuid())['widget']
        if (!exists(xWidget, 'layout'))
            return Array.from(this._vvd.getSubviewMap(this).values())
        // return Array.from(this._virtualChildren.values())
        const _xpathOfGeneric = s => s.replace(/\[-?\d+]/g, '').replace(/\//g, '.')
        const _getTargets = (target: string, _vns: Map<string, VNodeChild>) =>
            Array.from(_vns.keys()).filter(k => _xpathOfGeneric(k).endsWith(target)).map(k => _vns.get(k))
        const _loop = (_layout: Record<string, any>,
                       before: (_layout: Record<string, any>) => void,
                       after: (_layout: Record<string, any>) => void) => {
            before(_layout)
            if (!exists(_layout, 'children') || !Array.isArray(_layout['children'])) return
            const {children} = _layout
            for (const child of children) _loop(child, before, after)
            after(_layout)
        }
        const tree: DSTree<any> = new DSTree()
        _loop(clone(xWidget['layout']), (_layout) => {
            const node = TreeNode.build()
            const {type} = _layout
            if (type === 'widget')
                // node.setValue(_getTargets(_layout['target'], this._virtualChildren)[0])
                node.setValue(_getTargets(_layout['target'], this.convertSubviewMap(this._vvd.getSubviewMap(this)))[0])
            else
                node.setValue(_layout)
            tree.push(node)
        }, (_layout) => {
            if (exists(_layout, 'children'))
                tree.reduce(_layout['children'].length)
        })
        tree.traverse(tree.root(), () => false, (node) => {
            const _layout = node.getValue()
            if (_layout.__v_isVNode) {
                node.setValue(_layout)
                return;
            }
            const {type} = _layout
            if (type === 'widget') return
            const func = RegisteredLayoutFunctions.get(type)
            const view = func(_layout, node.getChildren().map(_node => _node.getValue()))
            node.setValue(view)
        })
        return tree.root().getValue()
    }

    /** Overwrite linkage of base class to inject scope. */
    linkage(): this {
        const xWidget = this._vvd.wcd(this.uuid())['widget']
        if (!exists(xWidget, 'scripts')) return this
        const {scripts} = xWidget
        for (const script of scripts) {
            try {
                AsynchronousExecutor(this.buildUserspaceAccessibleObjects(), script).then()
            } catch (e) {
                console.error(e)
            }
        }
        return this
    }

    /**
     * Binding events for sub widget components
     * Why the method occurs in ContainerComponent?
     *   Cause user scripts may access the data under ContainerComponent.
     */
    bindScripts(widget: WidgetComponent) {
        const xWidget = this._vvd.wcd(this.uuid())['widget']
        if (!exists(xWidget, 'bindScripts')) return this
        const {bindScripts} = xWidget
        for (const rtp /* relative template path */ in bindScripts) {
            if (!widget.xpathOfGeneric().endsWith(rtp)) continue
            const events = bindScripts[rtp]
            for (const eventName in events) {
                const scripts = events[eventName]
                const topic = `uuid:${widget.uuid()};event:${eventName}`
                mbus.subscribe(topic,
                    async () => {
                        for (const script of scripts)
                            await AsynchronousExecutor(this.buildUserspaceAccessibleObjects(), script)
                    })
            }
        }
        return this
    }

    private convertSubviewMap(map: Map<string, [VNodeChild, WidgetComponent]>) {
        const m: Map<string, VNodeChild> = new Map
        map.forEach((tuple, xpath) => m.set(xpath, tuple[0]))
        return m
    }
}

/**
 * @todo Testing ...
 * @todo The dynamic container component is related to array schema.
 *       Therefore, you are supposed to manage the related array(_list).
 *       And all functionalities associate with "_list" should been hide in member functions.
 */
export abstract class DynamicContainerComponent extends ContainerComponent {
    private _proxySchema: any = null
    // /**
    //  * DynamicContainerComponent constructor
    //  */
    // constructor(parent: WidgetComponent = null) {
    //     super(parent);
    // }
    /**
     * @note Need override!
     */
    componentCreated() {
        this._proxySchema = this.proxySchema(this._vvd.wcd(this.uuid()))
        if (this._proxySchema === null)
            throw new Error('Overwrite DynamicContainerComponent::setProxySchema method ' +
                'and set DynamicContainerComponent::_proxySchema')
    }

    /**
     * Locate the related dynamic 'array schema node' in constructor.
     * @return schema array node
     */
    abstract proxySchema(wcd: Record<string, any>): Record<string, any>;

    /** Get dynamic array schema */
    getProxySchema() {
        return this._proxySchema
    }

    /** Get dynamic array entity */
    getDynamicArray(): any[] {
        return this._proxySchema['_list']
    }

    getSubcomponentNumber(): number {
        return this._proxySchema['_list'].length
    }

    createComponentBySchema(schema, uuid, xpath) {
        return this._vvd.createComponentByXPath(schema, uuid, xpath)
    }

    /**
     * Add one subcomponent
     * @note Only support array schema
     */
    addSubComponent() {
        this._vvd.addSubComponent(this)
    }

    /**
     * Add one subcomponent width default data
     * @note Only support array schema
     */
    addSubComponentWidthData(data) {
        this._vvd.addSubComponentWithData(this, data)
    }

    /**
     * Remove several specific subcomponents
     * @note Only support array schema
     */
    spliceSubComponents(from: number, length: number) {
        this._vvd.spliceSubComponents(this, from, length)
    }

    /**
     * Remove all subcomponents
     * @note Only support array schema
     */
    clearSubComponents() {
        this._vvd.clearSubComponents(this)
    }
}

export abstract class BusinessComponent extends ContainerComponent {
}

/** Type validation */
export function isBasicComponent(w: WidgetComponent) {
    return w instanceof BasicComponent
}

export function isContainerComponent(w: WidgetComponent) {
    return w instanceof ContainerComponent
}

export function isDynamicComponent(w: WidgetComponent) {
    return w instanceof DynamicContainerComponent
}

export function isBusinessComponent(w: WidgetComponent) {
    return w instanceof BusinessComponent
}

export function isBasicComponentType(type: string) {
    if (!RegisteredMetaWidgets.has(type)) {
        type = 'placeholder'
    }
    const com = RegisteredMetaWidgets.get(type)(null)
    return com instanceof BasicComponent
}

export function isContainerComponentType(type: string) {
    if (!RegisteredMetaWidgets.has(type)) {
        type = 'placeholder'
    }
    const com = RegisteredMetaWidgets.get(type)(null)
    return com instanceof ContainerComponent
}

export function isDynamicComponentType(type: string) {
    if (!RegisteredMetaWidgets.has(type)) {
        type = 'placeholder'
    }
    const com = RegisteredMetaWidgets.get(type)(null)
    return com instanceof DynamicContainerComponent
}

/**
 * @todo Layout still exists many problems. We should take layout logic into consideration more.
 */
type WidgetBuilder = (parent: WidgetComponent) => WidgetComponent;
type WidgetBuiltin = (com: WidgetComponent, ...args) => any;
type WidgetLayoutFunction = (layout: Record<string, any>, nodes: VNodeChild[]) => VNodeChild;
const RegisteredMetaWidgets: Map<string, WidgetBuilder> = new Map();
const RegisteredBuiltins: Map<string, WidgetBuiltin> = new Map();
const RegisteredLayoutFunctions: Map<string, WidgetLayoutFunction> = new Map();

/** Define a widget builder. */
export function defineWidget(name: string, builder: WidgetBuilder) {
    RegisteredMetaWidgets.set(name, builder);
    const info = window.probe.info()
    if (!('widgets' in info)) info['widgets'] = []
    info['widgets'].push(name)
}

/** Define a layout function. */
export function defineLayout(name: string, layoutFunction: WidgetLayoutFunction) {
    RegisteredLayoutFunctions.set(name, layoutFunction)
    const info = window.probe.info()
    if (!('layouts' in info)) info['layouts'] = []
    info['layouts'].push(name)
}

/** Define an userspace function. */
export function defineBuiltin(name: string, builtin: WidgetBuiltin) {
    RegisteredBuiltins.set(name, builtin)
    const info = window.probe.info()
    if (!('builtins' in info)) info['builtins'] = []
    info['builtins'].push(name)
}

export class WidgetAccessor {
    // private _wcd: Record<string, any>;
    private constructor(private readonly _wcd: Record<string, any>) {
    }

    static access(wcd: Record<string, any>) {
        return new WidgetAccessor(wcd);
    }

    xPath(xpath: string) {
        if (xpath === "") {
            return this
        }

        if (this.getType() === 'object') {
            const paths = xpath.split('.')
            const path = paths.shift()
            const schema = this.getProperties()[path]
            const xSchema = this.getXProperties()[path]
            const wcd = WidgetAccessor.access({...schema, ...xSchema})
            return wcd.xPath(paths.join('.'))

        } else if(this.getType() === 'array') {
            const schema = WidgetAccessor.access(this.getItems())
            return schema.xPath(xpath)
        } else {
            throw new Error(`${this._wcd} dose not have ${xpath}`)
        }

    }

    getWcd() {
        return this._wcd
    }

    getWidgetComponentType() {
        if (exists(this._wcd, 'widget')) {
            return exists(this._wcd, 'widget') && exists(this._wcd['widget'], 'type') ? this._wcd['widget']['type'] : null
        } else if (exists(this._wcd, 'x-widgetType')) {
            return exists(this._wcd['x-widgetType'], 'widget') ? this._wcd['x-widgetType']['widget']['type'] : null
        }
    }

    getLabel() {
        return this._wcd['label']
    }

    /** Kept for testing */
    getVisible() {
        return this._wcd['visible'] !== false
    }

    getEditable() {
        return this._wcd['widget']['editable']
    }

    getMode() {
        return this._wcd['widget']?.mode ?? 'WRITE'
    }

    getOptions(): Record<string, any> {
        return exists(this._wcd['widget'], 'options') ? this._wcd['widget']['options'] : {}
    }

    setOptions(name, value) {
        if (exists(this._wcd['widget'], 'options') && exists(this._wcd['widget']['options'], name)) {
            this._wcd['widget']['options'][name] = value
        } else {
            this._wcd['widget']['options'][name] = value
        }
    }

    getPlaceholder() {
        return this.getOptions()?.placeholder ?? null
    }

    getRequired() {
        return this._wcd['widget']['required']
    }

    getErrorMessage() {
        return this._wcd['_errorMessage']
    }

    getType() {
        return this._wcd.type
    }

    getItems() {
        return this._wcd.items
    }

    getXItems() {
        return this._wcd['x-items']
    }

    getProperties() {
        return this._wcd['properties']
    }

    getXProperties() {
        return this._wcd['x-properties']
    }

    getLifetime(name: string) {
        if (exists(this._wcd['widget'], 'lifeTime')) {
            const lifetime = this._wcd['widget']['lifeTime']
            if (exists(lifetime, name)) {
                return lifetime[name]
            }
        }
        if (exists(this._wcd['x-widgetType'], 'widget')) {
            const lifetime = this._wcd['x-widgetType']['widget']['lifeTime']
            if (exists(lifetime, name)) {
                return lifetime[name]
            }
        }
        return []
    }

    getLayout() {
        if (exists(this._wcd, 'widget') && exists(this._wcd['widget'], 'layout')) {
            return this._wcd['widget']['layout']
        } else {
            return null
        }
    }

    getXWidgetType() {
        if (exists(this._wcd, 'x-widgetType')) {
            return this._wcd['x-widgetType']
        } else {
            return null
        }
    }
}

/**
 * Known as "vvd".
 * Take responsible for managing a whole widget instance.
 */
export class VueViewDriver {
    /** internal bus */
    private _ibus: Highway = new Highway;
    /**
     * Collect all widget instances.
     * The key is component's uuid.
     */
    private _components: Map<string, WidgetComponent> = new Map;
    private _containerSubviews: Map<string,
        Map<string, [VNodeChild, WidgetComponent]>> = new Map;
    private _wcd: Map<string, Record<string, any>> = new Map;
    private _templates: Map<string, TemplateObject> = new Map;
    /**
     * vrd: view reactive data.
     * @param buildComplete mark for first, avoid invalid rendering
     * @param structureHash Vue component needs this to update tree view.
     */
    private _vrd: Record<string, any> = reactive(
        {buildComplete: false, structureHash: ''})
    /** Record top widget. */
    private _topWidget: WidgetComponent = null;

    /**
     * Construct a VueViewDriver
     * @param rcd Render Context data, which come from OpenApi module.
     * @param OpenApiManager
     */
    constructor(private readonly rcd: Record<string, any>, public OpenApiManager: WidgetContextObject) {
    }

    /**
     * Add event listener
     * @note vvd exists several internal events.
     */
    addEventListener(event: string, callback: (...args) => void) {
        this._ibus.subscribe(event, callback)
    }

    getSubviewMap(container: ContainerComponent) {
        return this._containerSubviews.get(container.uuid())
    }

    getTopWidget() {
        return this._topWidget
    }

    vrd() {
        return this._vrd
    }

    wcd(uuid: string) {
        return this._wcd.get(uuid)
    }

    /** Access a widget's attributes! */
    access(_w: WidgetComponent) {
        return WidgetAccessor.access(this.wcd(_w.uuid()))
    }

    /**
     * Build all widget instances.
     * Activate life cycle functions.
     */
    build() {

        extendedTraverse(
            this.rcd, null, '',
            (schema, parent_uuid, xpath) => {
                this.createComponent(schema, parent_uuid, xpath)
            },
            (schema) => {
                this.mountComponent(schema)
            }
        )
        this._vrd.buildComplete = true
        this.updateView()
        this.OpenApiManager.addEventListener("structureChange", () => {
            this.updateView()
        })
    }

    /** Destroy all widget components. */
    destroy() {
        extendedTraverse(this.rcd, null, '',
            () => {
            },
            (schema) => {
                this.unmountComponent(schema)
            }
        )
    }

    /** Update tree view if necessary. */
    updateView() {
        const newHash = this.computeStructureHash()
        if (newHash !== this._vrd.structureHash) {
            this._vrd.structureHash = newHash
            this._ibus.publish("updateView", this._vrd.structureHash)
        }
    }

    /**
     * Generate different kinds of VNodeChild by
     * invoking plugin builders provided by Widget framework.
     */
    render() {
        if (!this._vrd.buildComplete) return null
        let topVirtualNode: VNodeChild = null
        const _widgetVirtualNode: Map<string, VNodeChild> = new Map
        extendedTraverse(this.rcd, null, '', (schema) => {
            const xWidget = schema['widget']
            const _uuid = xWidget['_uuid']
            if (!this._components.has(_uuid))
                throw new Error(`No such component : ${_uuid}`)
            const _widget = this._components.get(_uuid)
            if (isContainerComponent(_widget)) {
                // Solution 1
                // (widgetInstance as ContainerComponent).clearVirtualChildren()
                // Solution 2
                this.initContainerSubviewSpace(_widget as ContainerComponent)
            }
        }, (schema, parent_uuid, xpath) => {
            const xWidget = schema['widget']
            const _uuid = xWidget['_uuid']
            if (!this._components.has(_uuid))
                throw new Error(`No such component : ${_uuid}`)
            const _widget = this._components.get(_uuid)
            
            const _view = _widget.render()
            if (parent_uuid === null) {
                topVirtualNode = _view
            } else {
                _widgetVirtualNode.set(_uuid, _view)
                const parent = this._components.get(parent_uuid)
                if (isContainerComponent(parent)) {
                    // Solution 1
                    // (parent as ContainerComponent).addVirtualChild(xpath, _view)
                    // Solution 2
                    this.setContainerSubview((parent as ContainerComponent), xpath, _widget, _view)
                }
            }
        })
        return topVirtualNode
    }

    createComponentByXPath(branchSchema, uuid, xpath) {
        const xWidget = branchSchema['widget']
        let _type = xWidget['type']
        if (!RegisteredMetaWidgets.has(_type)) {
            _type = 'placeholder'
        }
        if (!this._templates.has(_type))
            this._templates.set(_type, new TemplateObject())
        const _builder: Function = RegisteredMetaWidgets.get(_type)
        const _widget: WidgetComponent = _builder(null)
        xWidget['_uuid'] = _widget.uuid()
        const _uuid = xWidget['_uuid']
        this._wcd.set(_widget.uuid(), reactive(branchSchema))
        this._components.set(_widget.uuid(), _widget)
        this._templates.get(_type).addComponent(_widget.uuid(), _widget);
        _widget.setParent(this._components.get(uuid))
        _widget.setXpath(xpath)
        _widget.setVueViewDriver(this)
        // _widget.validate(_widget)
        _widget.componentCreated()
        _widget.bindEvents()
        const _widgetVirtualNode: Map<string, VNodeChild> = new Map
        const _view = _widget.render()
        _widgetVirtualNode.set(_uuid, _view)
        const parent = this._components.get(uuid)
        if (isContainerComponent(parent)) {
            setTimeout(() => {
                this.setContainerSubview((parent as ContainerComponent), xpath, _widget, _view)
            }, 50)
        }

        return _widget
    }

    /** Add one child into dynamic container component */
    addSubComponent(_w: DynamicContainerComponent) {
        this.OpenApiManager
            .addContainerComponentItem(
                _w.getProxySchema(), undefined,
                (branchSchema) => {
                    extendedTraverse(branchSchema, _w.uuid(), _w.xpath(),
                        (schema, parent_uuid, xpath) => {
                            this.createComponent(schema, parent_uuid, xpath)
                        },
                        (schema) => {
                            this.mountComponent(schema)
                        })
                })
    }

    /** Add one child into dynamic container component */
    addSubComponentWithData(_w: DynamicContainerComponent, data: Record<string, any>) {
        this.OpenApiManager
            .addContainerComponentItem(
                _w.getProxySchema(), data,
                (branchSchema) => {
                    extendedTraverse(branchSchema, _w.uuid(), _w.xpath(),
                        (schema, parent_uuid, xpath) => {
                            this.createComponent(schema, parent_uuid, xpath)
                        },
                        (schema) => {
                            this.mountComponent(schema)
                        })
                })
    }

    /** Remove part of children in dynamic container component */
    spliceSubComponents(_w: DynamicContainerComponent, from: number, length: number) {
        const children = _w.getDynamicArray()
        if (from < 0 || from >= children.length || length < 1) return
        for (let i = Math.min(from + length, children.length) - 1; i >= from; i--) {
            const branchSchema = children[i]
            extendedTraverse(branchSchema, _w.uuid(), _w.xpath(),
                () => {
                },
                (schema) => {
                    this.unmountComponent(schema);
                },
            )
        }
        this.OpenApiManager.spliceContainerComponentItem(_w.getProxySchema(), from, length)
    }

    /** Remove all children in dynamic container component */
    clearSubComponents(_w: DynamicContainerComponent) {
        const children = _w.getDynamicArray()
        for (let i = 0; i < children.length; i++) {
            const branchSchema = children[i]
            extendedTraverse(branchSchema, _w.uuid(), _w.xpath(),
                () => {
                },
                (schema) => {
                    this.unmountComponent(schema)
                },
            )
        }
        this.OpenApiManager.clearContainerComponent(_w.getProxySchema())
    }

    updatedComponent(_widget) {
        _widget.componentUpdated()
        if (_widget.parent() !== null && _widget.parent() instanceof ContainerComponent)
            _widget.parent().getVueViewDriver().updatedComponent(_widget.parent())
    }

    /**
     * @method createComponent Create widget
     * @description create a component by wcd, and build the parent-child relation.
     * @param schema wcd
     * @param parent_uuid
     * @param xpath
     */
    private createComponent(schema, parent_uuid: string, xpath: string) {
        const xWidget = schema['widget']
        let _type = xWidget['type']
        if (!RegisteredMetaWidgets.has(_type)) {
            _type = 'placeholder'
        }
        if (!this._templates.has(_type))
            this._templates.set(_type, new TemplateObject())
        const _builder: Function = RegisteredMetaWidgets.get(_type)
        const _widget: WidgetComponent = _builder(this._components.has(parent_uuid)
            ? this._components.get(parent_uuid) : null) // wcd
        xWidget['_uuid'] = _widget.uuid()
        this._wcd.set(_widget.uuid(), reactive(schema))
        this._components.set(_widget.uuid(), _widget)
        this._templates.get(_type).addComponent(_widget.uuid(), _widget);
        if (parent_uuid === null || parent_uuid === '') {
            this._topWidget = _widget
        } else {
            _widget.setParent(this._components.get(parent_uuid))
        }
        _widget.setXpath(xpath)
        _widget.setVueViewDriver(this)
        // _widget.validate(_widget)
        const parameters = this.OpenApiManager.getParameters()
        Array.from(parameters.keys()).forEach((key: string) => {
            const isTarget = xpath.endsWith(key.split('.').join('/'))
            if (isTarget) {
                (_widget as BasicComponent).setValueState(parameters.get(key));
                (_widget as BasicComponent).handleValueChange(parameters.get(key));
            }
        })
        _widget.componentCreated()
        _widget.bindEvents()
    }

    /**
     * Mount widget by wcd
     * @param schema is not real schema, but wcd!
     */
    private async mountComponent(schema) {
        const xWidget = schema['widget']
        const _uuid = xWidget['_uuid']
        const _widget = this._components.get(_uuid)
        _widget.componentMounted()
    }

    /** Unmount widget by wcd */
    private unmountComponent(schema) {
        const xWidget = schema['widget']
        let _type = xWidget['type']
        const _uuid = xWidget['_uuid']
        const _widget = this._components.get(_uuid)
        _widget.componentBeforeDestroy()
        if (!RegisteredMetaWidgets.has((_type))) {
            _type = 'placeholder'
        }
        this._templates.get(_type).removeComponent(_uuid)
        const parent = _widget.parent()
        if (parent !== null) parent.removeChild(_uuid)
        this._components.delete(_uuid)
        if (_widget.parent() !== null && _widget.parent() instanceof ContainerComponent)
            this.removeContainerSubview(_widget.parent() as ContainerComponent, _widget.uuid())
    }

    /** Compute structure from top widget */
    private computeStructureHash() {
        return hash(JSON.stringify(this._topWidget.structure()))
    }

    /**
     * Allocate subviews space for a container
     * @todo Think about k-v of the Map!
     *       Now, component's xpath as key.
     *       It's not convenient for indexing!
     */
    private initContainerSubviewSpace(container: ContainerComponent) {
        if (!this._containerSubviews.has(container.uuid()))
            this._containerSubviews.set(container.uuid(), new Map)
    }

    /** add a subview */
    private setContainerSubview(container: ContainerComponent, xpath: string, widget: WidgetComponent, view: VNodeChild) {
        this._containerSubviews.get(container.uuid()).set(xpath, [view, widget])
    }

    /** remove a subview by uuid */
    private removeContainerSubview(container: ContainerComponent, uuid: string) {
        let xpath: string | null = null
        this._containerSubviews
            .get(container.uuid())
            ?.forEach((tuple, _xpath) => {
                if (tuple[1].uuid() === uuid)
                    xpath = _xpath
            })
        if (xpath !== null)
            this._containerSubviews.get(container.uuid()).delete(xpath)
    }
}

/**
 * The builtin function prepared for user scripts.
 * @note The function has possibility to trigger component linkage.
 *       Therefore, you can't invoke setValueState method of BasicComponent!
 */
defineBuiltin("setValue", (com: WidgetComponent, ...args) => {
    const xpath = args[0];
    const value = args[1]
    if (!isContainerComponent(com)) return
    const component = (com as ContainerComponent).getSubcomponent(xpath) as BasicComponent
    const wcd = component.getVueViewDriver().wcd(component.uuid())
    // We can't invoke setValueState here, because setValueState will trigger components linkage!
    component
        .getVueViewDriver().OpenApiManager
        .setBasicComponentValue(wcd, value)
    // component.handleContextChange(wcd)
    // driving value change
    component.handleValueChange(value)
})
