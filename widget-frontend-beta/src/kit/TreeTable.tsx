import {CaretTop, CaretBottom, ArrowRight, ArrowDown} from '@element-plus/icons-vue'
import {
    WidgetComponent,
    WidgetAccessor,
    defineWidget,
    ContainerComponent,
    BasicComponent,
    DynamicContainerComponent
} from "@widget-frontend/widget-frontend-core";
import TreeTableContainer from "./components/TreeTable.vue"
import "../style-css/tree-table.css"
import {reactive, ref} from "vue";
import {exists} from "../basic/utils/comm.ts";
import {Menu} from '@element-plus/icons-vue'
import Dialog from "./components/Dialog.vue"

type headerItem = { label: string, id: string, visible: boolean }

export class TreeTable extends DynamicContainerComponent {
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    private keyName: string | number = null
    private sortStyle: string = 'origin'
    sortable: Record<string, any> = []

    private childrenKey: string = 'children'

    private header: Array<headerItem> = []
    // 选择行数据的方式： single(单选), multiple(多选)
    private selectStyle: string = null
    //{name: "name", position: 'left'}
    private fixList: Array<{ name: string, position: string }> = [{name: "name", position: 'left'}, {name: "age", position: 'left'}, {name: "address", position: 'right'}]

    // ------------------------------------------------------

    setKeyName(value: string | number) {
        if (!value)
            throw new Error('table need a key')
        this.keyName = value
    }

    componentCreated() {
        super.componentCreated();
        this._accessor = this._vvd.access(this)
        this.header = this.buildHeader(this.getVueViewDriver().OpenApiManager.query(this._accessor.getItems()), [])
        if (this._accessor.getOptions().sortStyle) {
            this.sortStyle = this._accessor.getOptions().sortStyle
        }
        this.setSortable(this._accessor.getOptions().sortable ? this._accessor.getOptions().sortable : [])
        this.selectStyle = exists(this._accessor.getOptions(), 'selectStyle') ? this._accessor.getOptions()['selectStyle'] : null
        if (this.selectStyle && !['single', 'multiple'].includes(this.selectStyle))
            throw new Error(`options selectStyle  not be ${this.selectStyle}`)
    }

    override componentMounted() {
        super.componentMounted();
        this.newDataStructure.value = this.formatDataStructure(this)

    }

    proxySchema(wcd: Record<string, any>) {
        return wcd
    }

    setSortable(sortable) {
        this.sortable.value = sortable
    }

    isActive(name: string, order: string) {
        return this.sortable.value.some(item => {
            return item.name === name && item.order === order
        })
    }

    /**
     * 设置sort类型
     * @param value enum: ['slim', ''origin]
     */
    setSortStyle(value) {
        if (value)
            this.sortStyle = value
    }

    /**
     * 排序改变
     * @param name
     * @param order
     */
    sortChange(name: string, order: string) {
        const newOrder = {name, order}
        const index = this.sortable.value.findIndex(item => item.name === name)
        const oldOrder = this.sortable.value[index]
        if (newOrder.order === oldOrder.order) {
            newOrder.order = null
        }
        this.sortable.value.splice(index, 1, newOrder)
    }

    /**
     * 获取sort数据
     * @returns
     */
    getSortable() {
        if (this.sortStyle === 'slim') {
            return this.sortable.value
                .filter(ele => ele.order)
                .map(ele => {
                    if (ele.order === 'ASC') {
                        return `+${ele.name}`
                    } else if (ele.order === "DESC") {
                        return `-${ele.name}`
                    }
                })
        }
        return this.sortable.value
    }

    /**
     * 根据传入数据重新加载表格
     * @param data 数据
     */
    reload(data: Array<Record<string, any>>) {
        this.clearSubComponents()
        data.forEach(item => this.addSubComponentWidthData(item))
    }

    /**
     * 列宽调整
     * @param e 鼠标点击事件
     */
    initResize(e) {
        const that = this
        let resizeHandle = e.target.parentNode
        let startX = e.clientX
        let startWidth = parseInt(document.defaultView.getComputedStyle(resizeHandle).width, 10)
        document.documentElement.addEventListener('mousemove', doResize, false)
        document.documentElement.addEventListener('mouseup', stopResize, false)

        function doResize(e) {
            if (resizeHandle) {
                let newWidth = startWidth + e.clientX - startX
                const name = resizeHandle.attributes['domProps-name'].value
                const colList = document.querySelectorAll(`.w-tree-table__col[domProps-name=${name}]`)
                // const colSortList = {}
                // colList.forEach((col, index) => {
                //     const colName = col.attributes['domProps-name'].value
                //     if (Object.keys(colSortList).includes(colName)){
                //         colSortList[colName].push(col)
                //     } else {
                //         colSortList[colName] = []
                //         colSortList[colName].push(col)
                //     }
                // })
                // const Index = Object.keys(colSortList).findIndex(key => key === name)
                // console.log(Index, colSortList)
                colList.forEach(node => {
                    if (newWidth / 120 > 1)
                        (node as HTMLTableColElement).width = newWidth + ''
                })
            }
        }

        function stopResize(e) {
            document.documentElement.removeEventListener('mousemove', doResize, false)
            document.documentElement.removeEventListener('mouseup', stopResize, false)
            resizeHandle = null
            startX = null
            startWidth = null
        }
    }

    /**
     * 解析表头结构，生成表头单元格
     */
    buildHeader(schema: Record<string, any>, keyList: Array<string>) {
        const header = []
        const access = WidgetAccessor.access(schema)
        if (access.getType() === 'object' && !['date-range-picker', 'time-range-picker'].includes(access.getXWidgetType())) {
            Object.keys(access.getProperties()).forEach(key => {
                if (key === this.childrenKey) return
                header.push(...this.buildHeader({...access.getProperties()[key], ...access.getXProperties()[key]}, [...keyList, key]))
            })
        } else if (access.getType() === 'array' && !['multiple-select', 'radio-group', 'checkbox-group'].includes(access.getXWidgetType())) {

        } else if (['string', 'number', 'boolean'].includes(access.getType())) {
            header.push({
                label: access.getLabel(),
                id: keyList.join('-'),
                visible: access.getVisible()
            })
            if (access.getXWidgetType() === 'id')
                this.setKeyName(keyList.pop())
        }
        return header
    }

    setFix(name: string) {
        name = name.replace(/children-/g, '')
        const Index = this.fixList.findIndex(item => item.name === name)
        if (Index > -1) {
            const position = this.fixList[Index].position
            const offsetValue = 0 + position === 'left' ? -1 : 1
            return `position: sticky; ${position}: ${offsetValue}px; z-index: 9`
        } else {
            return ""
        }

    }

    /**
     * 创建表头
     * @param schema
     */
    createHeader() {
        return this.header.map((item: headerItem, index) => {
            if (item.visible) {
                return <td class='w-tree-table__td w-tree-table__th' domProps-name={`w-tree-table__col-${item.id}`}
                           style={this.setFix(item.id)}>
                    {
                        index === this.header.length - 1 ? null :
                            <div class="w-tree-table__draggable" onMousedown={(event) => {
                                this.initResize(event)
                            }}></div>
                    }
                    {this.createHeaderCell(item.id, item.label)}
                </td>
            } else {
                return null
            }
        })
    }

    /**
     * 创建表头单元格
     * @param key
     * @param label
     */
    createHeaderCell(key: string, label: string) {
        return <div class={'w-tree-table__cell'}>
            <div class=""></div>
            <div class="w-tree-table__header-cell-label" onClick={() => {
                this.clickLabel(key)
            }}>{label}</div>
            {
                this.sortable.value.some(sort => sort.name === key) ?
                    <div class='w-tree-table__sort'>
                        <div
                            class={{
                                asc: true,
                                active: this.isActive(key, 'ASC')
                            }}
                        >
                            <el-icon
                                onClick={() => {
                                    this.sortChange(key, 'ASC');
                                }}
                            >
                                <CaretTop/>
                            </el-icon>
                        </div>
                        <div
                            class={{
                                desc: true,
                                active: this.isActive(key, 'DESC'),
                            }}
                        >
                            <el-icon
                                onClick={() => {
                                    this.sortChange(key, 'DESC');
                                }}
                            >
                                <CaretBottom/>
                            </el-icon>
                        </div>
                    </div>
                    : null
            }
        </div>
    }

    clickLabel(key: string) {
        const sort = this.sortable.value.find(item => item.name === key)
        const order = sort['order']
        const handle = [
            {test: (order: string) => order === "ASC", handle: () => this.sortChange(key, 'DESC')},
            {test: (order: string) => order === "DESC", handle: () => this.sortChange(key, 'DESC')},
            {test: (order: string) => order === null || order === undefined, handle: () => this.sortChange(key, 'ASC')},
        ]
        for (let index = 0; index < handle.length; index++) {
            if (handle[index].test(order)) {
                handle[index].handle()
                break
            }
        }
    }

    createColgroup() {
        return this.header.map((item: headerItem) => {
            if (item.visible) {
                return <col class={`w-tree-table__col`} domProps-name={`w-tree-table__col-${item.id}`}
                            width={"120"}></col>
            } else {
                return null
            }
        })
    }

    checkShowArrow(data) {
        return data.originCom.getChildren().findIndex(child => child.xpath().split('/').pop() === this.childrenKey)
    }

    /**
     *
     * @param data
     * @param rowIndex
     * @returns
     */
    createRow(data, rowIndex: number) {
        return data.com
            .filter((com: WidgetComponent) => {
                if (com instanceof WidgetComponent)
                    return WidgetAccessor.access(com.getVueViewDriver().wcd(com.uuid())).getVisible()
                return true
            })
            .map((com: WidgetComponent, index: number) => {
                const showArrow = index === 0 ? this.checkShowArrow(data) : false
                return this.createCell(com, data.span, showArrow, rowIndex)
            })
    }

    private activeRowIds: { value: Array<string> } = reactive({value: []})

    expendRow(com: WidgetComponent, rowIndex: number) {
        const uuid = com.parent().uuid()
        const Index = this.activeRowIds.value.findIndex(id => uuid === id)
        const childCom = com.parent().getChildren().find(child => child.xpath().split('/').pop() === this.childrenKey)
        const list = this.formatDataStructure(childCom)
        if (Index > -1) {
            this.activeRowIds.value.splice(Index, 1)
            list.map(item => {
                const Index = this.newDataStructure.value.findIndex(child => child.originCom.xpath() === item.originCom.xpath())
                this.newDataStructure.value.splice(Index, 1)
            })
        } else {
            this.activeRowIds.value.push(uuid)
            this.newDataStructure.value.splice(rowIndex + 1, 0, ...list)
        }
    }

    /**
     * 创建单元格
     * @param com
     * @param rowspan
     * @param showArrow
     * @param rowIndex
     */

    createCell(com: WidgetComponent, rowspan: number, showArrow: boolean, rowIndex: number) {
        if (com instanceof BasicComponent) {
            const id = com.xpath().replace(this.xpath() + '/', '').split('/').filter(ele => !ele.includes('[')).join('-')
            return <td class='w-tree-table__td' domProps-name={`w-tree-table__col-${id}`} rowspan={rowspan}
                       style={this.setFix(id)}>
                <div class='w-tree-table__cell'>
                    {
                        showArrow ? <div class="w-tree-table__handle">
                                <div class="w-tree-table__handle-space"
                                     style={`padding: ${5 * com.parent().xpath().split('/').filter(ele => ele === this.childrenKey).length}px`}></div>
                                <div class="w-tree-table__handle-arrow" onClick={() => {
                                    this.expendRow(com, rowIndex)
                                }}>
                                    {
                                        this.activeRowIds.value.includes(com.parent().uuid()) ? <el-icon>
                                                <ArrowDown/>
                                            </el-icon> :
                                            <el-icon>
                                                <ArrowRight/>
                                            </el-icon>
                                    }
                                </div>
                            </div>
                            : null
                    }
                    {com.render()}
                </div>
            </td>
        } else if (com.xpath().split('/').pop() !== this.childrenKey) {
            return this.createRow(com, rowIndex)
        }
    }

    formatDataStructure(com) {
        const array = []
        const children = com.getChildren()
        children.forEach(child => {
            const childSubView = [...child.getChildren()]
            const Index = childSubView.findIndex(item => item instanceof DynamicContainerComponent && item.xpath().split('/').pop() !== this.childrenKey)
            if (Index > -1) {
                const parentPath = childSubView[Index].xpath().replace(child.xpath() + '/', '')
                const subArray = this.formatDataStructure(childSubView[Index])
                childSubView.splice(Index, 1, subArray.shift())
                array.push({
                    span: subArray.length + 1,
                    com: childSubView,
                    originCom: child,
                    parentPath: parentPath
                }, ...subArray)
            } else {
                array.push({
                    span: 1,
                    com: childSubView,
                    originCom: child
                })
            }
        })
        return array
    }

    private newDataStructure: { value: Array<{ span: number, com: Array<WidgetComponent>, originCom: WidgetComponent }> } = reactive({value: []})

    createBody() {
        return this.newDataStructure.value.map((com, rowIndex: number) => <tr>
                {this.createRow(com, rowIndex)}
            </tr>
        )
    }

    private visible = reactive({value: false})
    private showHandleColumn() {
        this.visible.value = true
    }

    /** The core render function */

    override render() {
        if (!this._accessor.getVisible()) return null
        return <div>
            <TreeTableContainer uuid={this.uuid()}>
                <div class="w-tree-table__table-top">
                    <div>
                        <el-tooltip
                            className="item"
                            effect="dark"
                            content="显隐列"
                            placement="top">
                            <el-button circle icon={Menu}  onClick={() => {this.showHandleColumn()}}/>
                        </el-tooltip>
                        <Dialog visible={this.visible.value}></Dialog>
                    </div>
                </div>
                <div class="w-tree-table__header-wrapper">
                    <table class="w-tree-table__header" cellspacing={0}>
                        <colgroup>
                            {this.createColgroup()}
                        </colgroup>
                        <thead>
                        <tr>
                            {this.createHeader()}
                        </tr>
                        </thead>
                    </table>
                </div>
                <div class="w-tree-table__body-wrapper">
                    <table class="w-tree-table__body">
                        <colgroup>
                            {this.createColgroup()}
                        </colgroup>
                        <tbody>
                        {this.createBody()}
                        </tbody>
                    </table>
                </div>
            </TreeTableContainer>;
            <el-table border={true} fit={true} data={[
                {
                    date: '2016-05-03',
                    name: 'Tom',
                    age: 8,
                    address: 'No. 189, Grove St, Los Angeles',
                },
                {
                    date: '2016-05-02',
                    name: 'Tom',
                    age: 9,
                    address: 'No. 189, Grove St, Los Angeles',
                },
                {
                    date: '2016-05-04',
                    name: 'Tom',
                    age: 8,
                    address: 'No. 189, Grove St, Los Angeles',
                },
                {
                    date: '2016-05-01',
                    name: 'Tom',
                    age: 7,
                    address: 'No. 189, Grove St, Los Angeles',
                },
            ]}
                      show-summary
            >
                <el-table-column type="selection" width="55" />
                <el-table-column fixed={'left'} prop="date" label="Date"/>
                <el-table-column fixed={'left'} prop="name" label="Name"/>
                <el-table-column prop="name" label="Name" />
                <el-table-column prop="age" label="Age">

                </el-table-column>
                <el-table-column prop="name" label="Name"/>
                <el-table-column fixed={'right'} prop="address" label="Address" show-overflow-tooltip/>
            </el-table>
        </div>
    }
}

/**
 * After defining WidgetComponent, you should register the related component type!
 * @note If you didn't register the component type, the framework cannot grab the Component class information.
 *       The framework will not provide the necessary exception information for you when error occur.
 */
defineWidget('tree-table', (parent: WidgetComponent) => new TreeTable(parent))