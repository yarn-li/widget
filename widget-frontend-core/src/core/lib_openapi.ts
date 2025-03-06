import {clone, exists, formatQuery, getDefault, isBasicType, isObject, upLoadFile} from "../utils/functools.ts";
import {proxy} from '../ext/http.ts'
import {Highway} from "../libs/highway.ts";
import * as lib_schema from "./lib_schema.ts"

export function traverse(schema, callback: (schema) => any = undefined, after: (schema) => any = undefined) {
    if (exists(callback)) callback(schema)
    if (lib_schema.isRef(schema)) return
    if (lib_schema.isOneOf(schema)) {
        const {discriminator} = schema
        const {mapping} = discriminator
        Object.values(mapping).forEach(_schema => traverse(_schema, callback, after))
        return
    }
    const {type} = schema
    if (type === 'object') {
        const {_map} = schema
        Object.values(_map).forEach(_schema => traverse(_schema, callback, after))
        return
    }
    if (type === 'array') {
        const {_list} = schema
        Object.values(_list).forEach(_schema => traverse(_schema, callback, after))
    }
    if (exists(after)) after(schema)
}
const methodsSupport = ['get', 'post', 'put', 'delete']
function checkHttp(httpschema, xpath: string, schemas: Array<any> = []) {
    if (!isObject(httpschema))
        throw new Error(`${xpath} must be an object`)
    for (let method in httpschema) {
        if (methodsSupport.includes(method)) {
        const httpSchema = httpschema[method]
            if (!exists(httpSchema, 'operationId'))
                throw new Error(`lack of operationId`)
            if (exists(httpSchema, 'requestBody'))
                checkHttpRequestBody(httpSchema, `${xpath}/${method}`, schemas)
            if (exists(httpSchema, 'parameters'))
                checkHttpParameters(httpSchema, `${xpath}/${method}`, schemas)
            if (exists(httpSchema, 'responses'))
                checkHttpResponses(httpSchema, `${xpath}/${method}`, schemas)
        }
    }
}

function checkParameters(parameters: Array<{name: string, target: string}>, params: Record<string, any>) {
    return parameters.map(param => {
        if (exists(params, param.name)) {
            return {
                ...param,
                _value: params[param.name]
            }
        }
        return  {
            ...param,
            _value: null
        }
    })
}

function checkHttpRequestBody(httpSchema, xpath: string, schemas: Array<any>) {
    const {requestBody} = httpSchema
    if (!exists(requestBody, 'content'))
        throw new Error(`${xpath}/requestBody : lack of content`)
    const {content} = requestBody
    if (exists(content, 'application/json')) {
        if (!exists(content['application/json'], 'schema'))
            throw new Error(`${xpath}/requestBody/content/application/json : lack of schema`)
        const {schema} = content['application/json']
        schemas.push(schema)
        lib_schema.checkGeneric(content['application/json']['schema'], `/paths`)
    }
}

function checkHttpParameters(httpSchema, xpath: string, schemas: Array<any>) {
    const {parameters} = httpSchema
    if (!Array.isArray(parameters))
        throw new Error(`${xpath}/parameters : must be an array`)
    for (let i = 0; i < parameters.length; i++) {
        const param = parameters[i]
        if (!exists(param, 'in'))
            throw new Error(`${xpath}/parameters[${i}] : lack of in`)
        if (!exists(param, 'name'))
            throw new Error(`${xpath}/parameters[${i}] : lack of name`)
        if (!exists(param, 'required'))
            throw new Error(`${xpath}/parameters[${i}] : lack of required`)
        if (!exists(param, 'schema'))
            throw new Error(`${xpath}/parameters[${i}] : lack of schema`)
        param.style = getDefault(param, 'style', '')
        param.explode = getDefault(param, 'explode', false)
        const {schema} = param
        schemas.push(schema)
    }
}

function checkHttpResponses(httpSchema, xpath: string, schemas: Array<any>) {
    const {responses} = httpSchema
    if (!isObject(responses))
        throw new Error(`${xpath}/responses must be an object`)
    for (let code in responses) {
        if (!/[0-9]+/.test(code))
            throw new Error(`${xpath}/responses : http responses' key must be an number string`)
        checkHttpContent(responses[code], `${xpath}/responses/${code}`, schemas)
    }
}

function checkHttpContent(httpSchema, xpath: string, schemas: Array<any>) {
    if (!exists(httpSchema, 'content'))
        throw new Error(`${xpath} : lack of content`)
    const {content} = httpSchema
    if (exists(content, 'application/json')) {
        if (!exists(content['application/json'], 'schema'))
            throw new Error(`${xpath}/content/application/json : lack of schema`)
        const {schema} = content['application/json']
        schemas.push(schema)
        lib_schema.checkGeneric(schema, `${xpath}/content/application/json/schema`)
    }
    if (exists(content,'application/octet-stream')) {
        if (!exists(content['application/octet-stream'], 'schema'))
            throw new Error(`${xpath}/content/application/octet-stream : lack of schema`)
        const {schema} = content['application/octet-stream']
        schemas.push(schema)
        lib_schema.checkGeneric(schema, `${xpath}/content/application/octet-stream/schema`)
    }
    return true
}

function buildHttpUrl(url, parameters, args) {
    let hasQueryParam = false
    for (let pi = 0; pi < parameters.length; pi++) {
        const param = parameters[pi]
        if (param.in === 'path') {
            url = url.replaceAll(`{${param.name}}`, encodeURIComponent(args[pi]))
        } else if (param.in === 'query') {
            url = url + (hasQueryParam ? '&' : '?') + formatQuery(param, args[pi])
            hasQueryParam = true
        }
    }
    return url
}

function buildHttpParam(parameters, args) {
    let params = {}
    for (let pi = 0; pi < parameters.length; pi++) {
        const param = parameters[pi]
        if (param.in === 'query') {
            if(param.style === 'form' && param.explode && typeof args[pi] === 'object') {
                if (Array.isArray(args[pi])) {
                    params[param.name] = args[pi]
                } else {
                    params = Object.assign(params, args[pi])
                }
            } else {
                params[param.name] = args[pi]
            }

        }
    }
    return params
}

export  function  setOneOfValue(type: Array<string>, data) {
    if (!Array.isArray(type) || type.length === 0)
        throw new Error(`one of at last provide one type`)
    if (isObject(data) || Array.isArray(data))
        throw new Error(``)
    const options = {

    }
    if (!data || type.includes(typeof data)) {
        return data || null
    }
    throw new Error(`unknown data type, data : ${data}`)
}

export function setStdValue(type, data) {
    if (isObject(data) || Array.isArray(data))
        throw new Error(``)
    const lazyOptions = [
        {tf: () => type === 'number', hd: () => typeof data === type ? data : null},
        {tf: () => type === 'string', hd: () => typeof data === type ? data : null},
        {tf: () => type === 'boolean', hd: () => typeof data === type ? data : null},
        {tf: () => type === 'null', hd: () => null},
    ]
    for (let i = 0; i < lazyOptions.length; i++) {
        if (lazyOptions[i].tf())
            return lazyOptions[i].hd()
    }
    throw new Error(`unknown data type, data : ${data}`)
}

function unfold(_data, _prefix, _d: Map<string, any>) {
    if (!isObject(_data)) return
    Object.keys(_data).forEach(k => {
        const v = _data[k]
        if (isObject(v))
            unfold(v, `${_prefix}.${k}`, _d)
        else
            _d.set(`${_prefix}.${k}`, v)
    })
}

export function dumpsValue(root): any {
    const {type} = root
    if (type === 'object') {
        const {_map} = root
        const r = {}
        for (const key in _map) {
            r[key] = dumpsValue(_map[key])
        }
        return r
    }
    if (type === 'array') {
        const {_list} = root
        const r = []
        for (const each of _list) {
            r.push(dumpsValue(each))
        }
        return r
    }
    return root['_value']
}

export class OpenapiContextObject {

    protected userspace: Record<string, (...args) => any> = {};
    protected components: Map<string, any> = new Map();
    protected referenced: Array<string> = [];
    protected treeView: any;
    protected hooks: Highway = new Highway()
    protected parameters: Map<string, any> = new Map()

    protected constructor(protected schema: any) {}

    static build(schema: any) {
        return new OpenapiContextObject(schema).validateOpenApi({})
    }

    getParameters() {
        return this.parameters
    }

    getHttpFunctions() {
        return this.userspace
    }

    getComponents() {
        return this.components
    }

    getSchema() {
        return this.schema
    }

    addEventListener(event, listener: (...args) => any) {
        this.hooks.subscribe(event, listener)
        return this
    }
    /**
     * @deprecated
     */
    getViewSchema() {
        return this.treeView
    }

    getTreeView() {
        return this.treeView
    }

    /**
     * @deprecated
     */
    setViewSchema(v) {
        this.treeView = v
        return this
    }

    createObject(schema, data = undefined) {
        schema = lib_schema.isOneOf(schema)
            ? this.createObjectByOneOf(schema, data)
            : clone(lib_schema.isRef(schema) ? {...schema, ...lib_schema.getRef(this.schema, schema)} : schema)
        this.walkAssignValue(schema, data)
        return schema
    }

    createObjectByOneOf(_schema, data) {
        if (data === undefined)
            throw new Error(``)
        const {discriminator} = _schema
        const {propertyName, mapping} = discriminator
        if (!exists(data, propertyName))
            throw new Error(``) 
        const disc = data[propertyName]
        if (!exists(mapping, disc))
            throw new Error(`${Object.keys(mapping).join('/')}`)
        const schema = lib_schema.isRef(mapping[disc]) ? lib_schema.search(this.schema, mapping[disc]['$ref']) : mapping[disc]
        return this.createObject(schema, data)
    }

    alignValue(schema, data) {
        const tree = this.createObject(schema, data)
        return dumpsValue(tree)
    }

    appendArray(schema, data = undefined) {
        const {items, _list} = schema
        _list.push(this.createObject(items, data))
        return this
    }

    spliceArray(schema, from, size) {
        const {_list} = schema
        const pre = _list.length
        _list.splice(from, size)
        return _list.length - pre
    }

    clearArray(schema) {
        const {_list} = schema
        const pre = _list.length
        if (_list.length > 0)
            schema['_list'] = []
        return schema['_list'].length - pre
    }


    fillValue(schema, data, dpath: string = '') {
        if (isObject(data) || schema.type === 'object') {
            const kv: Map<string, any> = new Map
            unfold(data, '', kv)
            Array.from(kv.keys())
                .map(_k => [`${dpath}.${_k}`.split('.').filter(s => s !== '').join('.'), kv.get(_k)])
                .forEach(_kv => this.assignValueRecursive(schema, _kv[1], _kv[0]))
            return
        }
        dpath === ''
            ? this.assignNonObjectValue(schema, data)
            : this.assignValueRecursive(schema, data, dpath)
    }

    private assignValueRecursive(_schema, _data, _dpath: string) {
        const _route = _dpath.split('.').filter(s => s !== '')
        if (_schema['type'] !== 'object') return
        let i = 0
        let _map = _schema['_map']
        while (i < _route.length) {
            if (!exists(_map, _route[i])) return
            const sch = _map[_route[i]]
            if (i === _route.length - 1) {
                if (exists(sch, 'oneOf')) {
                    const type = sch.oneOf.map(ele => ele.type)
                    sch['_value'] = setOneOfValue(type, _data)
                } else {
                    sch['_value'] = setStdValue(sch['type'], _data)
                }
                return
            }
            if (sch['type'] !== 'object') return
            _map = sch['_map']
            ++i
        }
    }

    private assignNonObjectValue(_schema, _data) {
        if (_schema['type'] === 'array') {
            if (Array.isArray(_data)) {
                const {items} = _schema
                _schema['_list'] = _data.map(x => {
                    let r = null
                    try {
                        // r = isBasicType(items['type']) ? setStdValue(items['type'], x) : this.createObject(items, x)
                        r = this.createObject(items, x)
                    } catch (e) {

                    }
                    return r
                })
            }
            return
        }
        _schema['_value'] = setStdValue(_schema['type'], _data)
    }

    fillErrorMessage(schema, message: string) {
        this.assignErrorMessage(schema, message)
    }

    private assignErrorMessage(_schema, message: string) {
        _schema['_errorMessage'] = message
    }

    protected validateOpenApi(params) {
        /**
         * Functions:
         *   1. structure check(schema)
         *     1.1. entry
         *     1.2. components/schemas
         *     1.3. paths/..../schema
         *   2. check references
         *   3. construct http functions(userspace)
         *   4. construct instance tree
         */
        const openapi = this.schema
        if (!exists(openapi, 'entry'))
            throw new Error(`openapi lack of entry`)
        if (!exists(openapi, 'paths'))
            throw new Error(`openapi lack of paths`)
        if (!exists(openapi, 'components'))
            throw new Error(`openapi lack of components`)
        const {entry, components, paths} = openapi
        if (!exists(entry, 'schema'))
            throw new Error(`openapi lack of entry/schema`)
        if (!exists(components, 'schemas'))
            throw new Error(`openapi lack of components/schemas`)
        const {schemas} = components
        const newSchema = this.initSchema(entry.schema, entry.widgetType)
        if (exists(entry, 'parameters')) {
            const parameters = checkParameters(entry['parameters'], params)
            parameters.forEach(param => {
                const key = param.target.replace('$.', '')
                if(param._value !== null) {
                    this.parameters.set(key, param._value)
                }
            })
        }
        lib_schema.checkGeneric(newSchema, '/entry')
        lib_schema.traverse(newSchema, s => this.addReference(s))
        for (const name in schemas) {
            lib_schema.checkGeneric(schemas[name], `/components/schemas/${name}`)
            lib_schema.traverse(newSchema, (schema) => this.addReference(schema))
            this.components.set(`#/components/schemas/${name}`, schemas[name])
        }
        const httpOfSchemas = []
        for (const urlTemplate in paths)
            checkHttp(paths[urlTemplate], `/paths/${urlTemplate}`, httpOfSchemas)
        httpOfSchemas.forEach(_schema => lib_schema.traverse(_schema, s => this.addReference(s)))
        for (const ref of this.referenced) {
            const path = ref.substring(2)
            if (!lib_schema.search(openapi, path))
                throw new Error(`no such reference : ${ref}`)
        }
        for (const urlTemplate in paths)
            this.buildHttpFunction(paths[urlTemplate], urlTemplate)
        this.treeView = this.createObject(newSchema)
        return this

    }

    protected initSchema(schema: any, widgetType: any) {
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

    protected addReference(schema) {
        if (lib_schema.isRef(schema))
            this.referenced.push(schema['$ref'])
    }

    protected buildHttpFunction(httpschema, urlTemplate) {
        for (let method in httpschema) {
            if (methodsSupport.includes(method)) {  
                const schema = httpschema[method]
                this.buildHttpMethodFunction(schema, urlTemplate, method)
            }
        }
    }

    protected buildHttpMethodFunction(httpschema, urlTemplate, method) {
        const self = this
        const {operationId, parameters, requestBody, responses} = httpschema
        const paramSize = (!exists(parameters) ? 0 : parameters.length) + (!exists(requestBody) ? 0 : 1)
        this.userspace[operationId] = this.handleBuildMethodFunction(httpschema, paramSize, urlTemplate, method, self)
    }

    protected handleBuildMethodFunction(httpschema, paramSize, urlTemplate, method, self) {
        const {requestBody, responses} = httpschema
        if (requestBody && exists(requestBody.content, "multipart/form-data")){
            return async (...args) => {
                const httpFunction = this.buildNormalHttpMethodFunction(httpschema, paramSize, urlTemplate, method, self)
                const options = args[args.length - 1]
                if(exists(options, 'isUpload') && options.isUpload) {
                    args.pop()
                    return httpFunction(...args)
                }
                const files = await upLoadFile()
                if (!files) return
                const formData = new FormData()
                for (const file of files as Array<File>) {
                    formData.append('file', file, file.name);
                }
                return httpFunction(formData)
            }
        } else {
            return this.buildNormalHttpMethodFunction(httpschema, paramSize, urlTemplate, method, self)
        }
    }

    protected buildNormalHttpMethodFunction(httpschema, paramSize, urlTemplate, method, self) {
        const {operationId ,parameters, requestBody, responses} = httpschema
        return async (...args) => {
            let option = null
            if (args[args.length -1] && args[args.length -1].type === 'httpOption') {
                option = args[args.length -1]
                args.pop()
            }
            const application = ['application/json', 'application/octet-stream', 'multipart/form-data'].find(item => requestBody && exists(requestBody['content'], item)) || 'application/json'
            if (args.length !== paramSize)
                throw new Error(`http ${operationId} parameters size : ${paramSize}, invoking args size : ${args.length}`)
            let uri = !exists(parameters) ? urlTemplate : buildHttpUrl(urlTemplate, parameters, args)
            const params = {}
            let req = !exists(requestBody) ? {} : args[args.length - 1]
            const responsesType = exists(responses['200']['content'], 'application/json') ? 'application/json' : 'blob'
            const resp = await proxy.cli.send(method, uri, params, {data: req}, {'content-type': application}, responsesType, option)
            if (exists(responses, '200') && exists(responses['200']['content'], 'application/json'))
                return self.alignValue(responses['200']['content']['application/json']['schema'], resp.data)
                // return resp.data
            else if (exists(responses, '200') && exists(responses['200']['content'], 'application/octet-stream')) {
                return resp
            }
            else {
                return {}
            }
        }
    }

    protected walkAssignValue(_schema, _data = undefined) {
        const {type} = _schema
        _schema['_errorMessage'] = ''
        if (_data === undefined && exists(_schema, 'default'))
            _data = _schema['default']
        if (_data === undefined && exists(_schema, 'x-items')) {
            const xItems = _schema['x-items']
            if (exists(xItems, 'default'))
                _data = xItems['default']
        }
        if (type === 'object') {
            const properties = _schema['properties']
            const xProperties = _schema['x-properties']
            const _map = {}
            for (let key in properties) {
                // if (exists(_data) && !exists(_data, key))
                //     throw new Error(``)
                let iSchema = {}   
                if (xProperties[key].widget.type === 'default') {
                    const xWidgetType = properties[key]['x-widgetType']
                    if (!exists(properties[key], 'x-widgetType'))
                        throw new Error(`lack of x-widgetType`)
                    iSchema = {...properties[key], ...xWidgetType}    
                } else {
                    iSchema = {...properties[key], ...xProperties[key]}
                }
                _map[key] = this.createObject(iSchema, exists(_data) ? _data[key] : undefined)
            }
            _schema['_map'] = _map
            return
        }
        if (type === 'array') {
            const _list = []
            const items = _schema.items
            const xItems = _schema['x-items']
            const iSchema = {...items, ...xItems}
            if (exists(_data) && !Array.isArray(_data))
                throw new Error(``)
            if (exists(_data))
                for (let i = 0; i < _data.length; i++)
                    _list.push(this.createObject(iSchema, _data[i]))
            _schema['_list'] = _list
            return
        }
        if (exists(_schema, 'oneOf')) {
            const type = _schema.oneOf.map(ele => ele.type)
            _schema['_value'] = setOneOfValue(type, _data)
        } else {
            _schema['_value'] = setStdValue(type, _data)
        }
    }

}
