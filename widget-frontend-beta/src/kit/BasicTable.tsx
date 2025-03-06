import {
    ContainerComponent,
    defineWidget,
    DynamicContainerComponent, internation, isBasicComponent, isContainerComponent,
    WidgetAccessor, WidgetComponent
} from "@widget-frontend/widget-frontend-core";
import {ElCheckbox, ElCheckboxGroup, ElRadio, ElRadioGroup} from "element-plus"
import {CaretBottom, CaretTop, QuestionFilled, Close} from "@element-plus/icons-vue";
import '../style-css/base-table.css'
import {reactive, computed, watch, nextTick} from "vue";
import BaseTableContainer from "./components/BaseTable.vue"
import VisibleOrderTable from "./components/VisibleOrderTable.vue";
import {exists} from "../basic/utils/comm.ts";
import {
    isBasicComponentType,
    isContainerComponentType, isDynamicComponent, isDynamicComponentType
} from "@widget-frontend/widget-frontend-core/src/core/lib_view.ts";
import {BaseQueryTable} from "./BaseQueryTable.tsx";
import dataFormat from "../basic/utils/dataFormat.ts";
import showHide from "../assets/images/showHide.svg"

type columnOption = {
    sortable?: boolean,
    order?: string,
    'summary-method'?: string,
    fixed?: string,
    width?: number,
    'min-width'?: number
    'summary'?: number
}

export type column = { id: string, label: string, visible: boolean, width: number, order: number, fixed: string }

export class BasicTable extends DynamicContainerComponent {
    private _state: Record<string, any> = reactive({value: null})
    private _accessor: WidgetAccessor = null
    private columnOptions: { value: Record<string, columnOption> } = reactive({value: {}})
    private columns: { value: Array<column> } = reactive({value: []})
    private keyName: string | number = ''
    private sortStyle: string
    sortOptions: { value: Map<string, { order: string, name: string }> } = reactive({value: new Map()})
    // 选择行数据的方式： single(单选), multiple(多选)
    private selectStyle: { value: string } = reactive({value: 'multiple'})
    private align: "left" | "right" | "center" = 'center'
    private selectValue: { value: Array<string | number> | string | number } = reactive({value: null})
    // 是否开启选择框
    private showSelect: { value: boolean } = reactive({value: false})
    // 是否全选
    private checkAll: { value: boolean } = reactive({value: false})
    // 全选框有选项但未全选状态
    private indeterminate: { value: boolean } = reactive({value: false})
    // 选择行的id
    private selectIdList: { value: Array<string | number> } = reactive({value: []})
    // 选择行的数据
    private selectList: { value: Array<Record<string, any>> } = reactive({value: []})
    private selectable: { value: Array<boolean> } = reactive({value: []})
    private showConfig: {value: boolean} = reactive({value: false})
    private animationClasss: {value: string} = reactive({value: ''})
    // 拓展列配置
    private expendColData: Record<string, any> = reactive({value: []})
    private expendColList: Record<string, any> = reactive({value: []})
    private colOptions = computed<Array<column>>(() => {
            const selectCol = reactive({
                id: 'selection',
                visible: this.showSelect.value,
                label: '',
                width: 55
            })
            return [selectCol, ...this.columns.value, ...this.expendColData.value]
        }
    )

    getSelectIdList = computed(() => {
        return [...this.selectIdList.value]
    })

    getSelectList = computed(() => {
        return [...this.selectList.value]
    })

    getSortData = computed(() => {
        const result = []
        if (this.sortStyle === 'multiple') {
            this.sortOptions.value.forEach(sort => {
                if (['ASC', 'DESC'].includes(sort.order)) {
                    result.push(sort)
                }
            })
        } else {
            this.sortOptions.value.forEach(sort => {
                let slimSort = ''
                if (sort.order === 'ASC') {
                    slimSort = `+${sort.name}`
                    result.push(slimSort)

                } else if (sort.order === "DESC") {
                    slimSort = `-${sort.name}`
                    result.push(slimSort)
                }
            })
        }
        return result
    })

    setSortable(sortList: Array<{ name: string, order: string }>) {
        sortList.forEach(sort => {
            if (!exists(this.columnOptions.value, sort.name)) {
                this.columnOptions.value[sort.name] = {}
            }
            this.columnOptions.value[sort.name].sortable = true
            this.columnOptions.value[sort.name].order = sort.order
        })
        this.initSortable()
    }

    getKey() {
        return this.keyName
    }

    getAccessor() {
        return this._accessor
    }

    proxySchema(wcd: Record<string, any>): Record<string, any> {
        return wcd;
    }

    // 初始化表格配置项
    componentCreated() {
        watch(() => [...this.colOptions.value],
            (val) => {
            }, {deep: true})
        super.componentCreated()
        this._state.value = this.dumpsValueState()
        this._accessor = this.getVueViewDriver().access(this)
        this.initTable()

    }

    initTable() {
        this.showSelect.value = this.getOptions('showSelect')
        this.columnOptions.value = this.getOptions('column-options') ? this.getOptions('column-options') : {}
        this.calculateSummary()
        this.selectStyle.value = this.getOptions('selectStyle') ? this.getOptions('selectStyle') : this.selectStyle.value
        if (this.selectStyle.value === 'multiple') {
            this.selectValue.value = []
        }
        this.setSortStyle(this.getOptions('sortStyle'))
        this.initSortable()
        this.columns.value = this.collectColumns(this._accessor.getWcd()['items'], [])
    }

    async createExpend() {
        const promiseList = this.getChildren().map((com, index) => {
            return new Promise(async (resolve, reject) => {
                const a = this.expendColData.value.map((col) => {
                    return new Promise(async (resolve, reject) => {
                        const result = typeof col.isAvailable === 'function' ? await col.isAvailable(com, index) : true
                        resolve(result)
                    })
                })
                const b = await Promise.all(a)
                resolve(b)
            })
        })
        this.expendColList.value = await Promise.all(promiseList)
    }

    override componentMounted() {
        super.componentMounted();
        this.initSelectable()
    }

    expendCol(colData) {
        this.expendColData.value.push(colData)
    }

    // 初始化排序配置
    initSortable() {
        Object.keys(this.columnOptions.value).forEach((key: string) => {
            const col = this.columnOptions.value[key]
            if (col.sortable === true) {
                this.sortOptions.value.set(key, {name: key, order: col.order})
            }
        })
    }

    // 获取配置项
    getOptions(name: string) {
        return this._accessor.getOptions()[name]
    }

    // 设置是否显示选择器
    setShowSelection(iShow: boolean) {
        this.showSelect.value = iShow
    }

    setSortStyle(style: string) {
        this.sortStyle = style
    }

    // 排序改变
    sortChange(name: string, order: string) {
        if (this.sortOptions.value.has(name)) {
            const sortOption = this.sortOptions.value.get(name)
            if (sortOption.order !== order) {
                this.sortOptions.value.set(name, {name, order})
            } else {
                this.sortOptions.value.set(name, {name, order: null})
            }
        }
    }

    // 收集列配置
    collectColumns(schema, keyList) {
        const columns = []
        if (exists(schema, '$ref')) {
            schema = this.getVueViewDriver().OpenApiManager.query(schema)
        }
        const access = WidgetAccessor.access(schema)
        if (access.getWidgetComponentType()  && isBasicComponentType(access.getWidgetComponentType())) {
            if (access.getVisible()) {
                const columnOption = this.columnOptions.value[keyList.join('.')]
                let width = null
                if (columnOption && exists(columnOption, 'width')) {
                    width = columnOption['width']
                }
                columns.push({
                    label: access.getLabel(),
                    id: keyList.join('-'),
                    visible: access.getVisible(),
                    order: 0,
                    width,
                    fixed: false,
                    required: access.getWcd().required
                })
            }
            if (access.getWidgetComponentType() === 'id') {
                this.keyName = keyList.pop()
            }
        } else if (access.getType() === 'object') {
            if (access.getVisible()) {
                Object.keys(access.getProperties()).forEach(key => {
                    columns.push(...this.collectColumns({...access.getProperties()[key], ...access.getXProperties()[key], required: access.getWcd()?.['required'].includes(key)??[].includes(key)}, [...keyList, key]))
                })
            }
        } else if (access.getType() === 'array' && isDynamicComponentType(access.getWidgetComponentType())) {
            if (access.getVisible()) {
                columns.push(...this.collectColumns({...access.getItems(), ...access.getXItems()}, [...keyList]))
            }
        }
        return columns
    }

    // 创建列的组，用于维护列宽
    createColgroup() {
        return <colgroup>
            {
                this.colOptions.value.filter(col => col.visible).map(col => this.createCol(col))
            }
        </colgroup>
    }

    createCol(col) {
        return <col class={'w-base-table__col'} col-name={col.id} width={col.width}></col>
    }

    setSelectList(value: Array<Record<string, any>>) {
        this.selectList.value = value
        this.selectIdList.value = value.map(ele => ele[this.keyName])
        this.selectValue.value = this.selectIdList.value
        this.handelCheckAll()
    }

    setSelectStyle(style: string) {
        this.selectStyle.value = style
    }

    reload(data: Array<Record<string, any>>) {
        this.clearSubComponents()
        data.forEach(item => this.addSubComponentWidthData(item))
        this.initSelectable()
    }

    // 创建表头
    // 1. 遍历table x-properties, 并创建表头单元格，判断显隐
    // 2. 收集可见列
    createHeader() {
        return <div class={'w-base-table__wrapper w-base-table__head-wrapper'}>
            <table class={'w-base-table__head-table'}>
                {
                    this.createColgroup()
                }
                <thead>
                <tr class={'w-base-table__head-tr'}>
                    {
                        this.showSelect.value ?
                            <th class="w-base-table_th w-base-table_column-selection">
                                <div class='w-base-table_th-cell'>
                                    {
                                        this.selectStyle.value === 'multiple' ?
                                            <el-checkbox size="small" indeterminate={this.indeterminate.value}
                                                         modelValue={this.checkAll.value} onChange={((value) => {
                                                this.handleSelectAllChange(value)
                                            })}>
                                                <br/>
                                            </el-checkbox> : null
                                    }

                                </div>
                            </th>
                            : null
                    }
                    {
                        this.columns.value
                            .filter(col => col.visible)
                            .map((col, index) => {
                                const isDrag = index === this.columns.value.length - 1 && this.expendColData.value.length === 0
                                return this.createHeaderCell(col, index, isDrag)
                            })
                    }
                    {
                        this.expendColData.value.map((col, index) => {
                            return this.createHeaderCell(col, index, index === this.expendColData.value.length - 1)
                        })
                    }
                </tr>
                </thead>
            </table>
        </div>
    }

    labelClick(id: string) {
        let order = ''
        const sortOption = this.sortOptions.value.get(id)
        if (sortOption.order === 'ASC') {
            order = 'DESC'
        } else if (sortOption.order === "DESC") {
            order = null
        } else if (sortOption.order === null) {
            order = 'ASC'
        }
        this.sortOptions.value.set(id, {name: id, order})
    }

    // 创建表头单元格
    // 1. 为可排序的列表头添加排序功能
    // 2. 添加tips
    // 3. 添加拖拽控制元素
    createHeaderCell(col, index, isDrag: boolean) {
        const sortable = this.sortOptions.value.has(col.id)
        // isDrag = true
        return <th align={this.align}
                   class={`w-base-table_th w-base-table_column-${col.id} ${sortable ? 'clickable' : ''}`}
                   onClick={() => {
                       if (sortable) {
                           this.labelClick(col.id)
                       }
                   }}>
            <div class={'w-base-table_th-cell'} style={'width: max-content'}>
                <div class={col.required ?? false ? 'required' : ''}>
                    {internation.translate(col.label)}
                </div>
                {
                    sortable ?
                        <div class='w-base-table__sort'>
                            <div
                                class={{
                                    asc: true,
                                    active: this.isActive(col.id, 'ASC')
                                }}
                            >
                                <el-icon
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        this.sortChange(col.id, 'ASC');
                                    }}
                                >
                                    <CaretTop/>
                                </el-icon>
                            </div>
                            <div
                                class={{
                                    desc: true,
                                    active: this.isActive(col.id, 'DESC'),
                                }}
                            >
                                <el-icon
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        this.sortChange(col.id, 'DESC');
                                    }}
                                >
                                    <CaretBottom/>
                                </el-icon>
                            </div>
                        </div>
                        : null
                }
            </div>
            {
                isDrag ? null :
                    <div class="w-base-table__draggable" drag-name={col.id} onMousedown={(event) => {
                        this.initResize(event)
                    }}></div>
            }
        </th>
    }

    // 判断该排序规则是否生效
    isActive(name: string, order: string) {
        if (!this.sortOptions.value.has(name)) return false
        const option = this.sortOptions.value.get(name)
        return option.order === order
    }

    // 创建表体
    // 1. 遍历subComponents 每一个子控件创建一行
    // 2. 添加选择器
    // 3. 添加表尾
    selectChange(value: Array<string | number> | number | string) {
        if (this.selectStyle.value === 'multiple') {
            this.handelCheckBoxChange(value as Array<string | number>)
        } else {
            this.radioChange(value as number | string)
        }
    }

    createBody() {
        this.createExpend()
        nextTick(() => {
            this.setColWidth()
        })
        const SelectGroup = this.selectStyle.value === 'multiple' ? ElCheckboxGroup : ElRadioGroup
        return <div class={'w-base-table__wrapper w-base-table__body-wrapper'}>
            <table class={'w-base-table__body-empty'} style={`height: ${this.getChildren().length === 0 ? 100 : 0}%`}>
                {
                    this.createColgroup()
                }
                <tbody>
                {
                    this.getChildren().length === 0 ? <tr>
                        <td colspan={this.colOptions.value.length}>
                            <div class={'empty'}>{internation.translate('widget.noData', '暂无数据')}</div>
                        </td>
                    </tr> : null
                }

                </tbody>
            </table>

            <SelectGroup size="small" style={'width: calc(100% - 6px);'} v-model={this.selectValue.value}
                         onChange={(value) => this.selectChange(value)}>
                <table class={'w-base-table__body-table'}>
                    {
                        this.createColgroup()
                    }
                    <tbody>
                    {
                        this.createBodyMain()
                    }
                    </tbody>
                </table>
            </SelectGroup>
        </div>
    }

    createBodyMain() {
        return this.getChildren().map((child, index) => this.createRow(child, index))
    }

    traverseRow(row: ContainerComponent, keyList: Array<string> = []) {
        const rows: Array<Record<string, WidgetComponent>> = []
        let rowMap = {}
        let span = 1
        row.getChildren().forEach(childCom => {
            const path = childCom.xpath().replace(row.xpath() + '/', '')
            const key = [...keyList, path].join('-')
            if (isBasicComponent(childCom) && childCom.getVueViewDriver().access(childCom).getVisible()) {
                rowMap[key] = {
                    span,
                    cell: childCom
                }
            } else if (isDynamicComponent(childCom) && childCom.getVueViewDriver().access(childCom).getVisible()) {
                const childRows = childCom.getChildren().map(child => this.traverseRow(child as ContainerComponent, [...keyList, key]))
                span = childRows.length === 0 ? 1 : childRows.length
                Object.keys(rowMap).forEach((key: string) => rowMap[key].span = span)
                const firstChild = childRows.shift()
                if (firstChild && firstChild.length > 0) {
                    rowMap = Object.assign(rowMap, {...firstChild[0]})

                }
                childRows.forEach(child => {
                    child.forEach(ele => {
                        rows.push(ele)
                    })
                })

            } else if (isContainerComponent(childCom) && childCom.getVueViewDriver().access(childCom).getVisible()) {
                childCom.getChildren().forEach(child => {
                    const path = child.xpath().replace(childCom.xpath() + '/', '')
                    const key = [...keyList, path].join('-')
                    rowMap[key] = {
                        span,
                        cell: childCom
                    }
                })
            }
        })
        rows.unshift(rowMap)
        return rows
    }

    initSelectable() {
        const script = this.getOptions('selectable') ? this.getOptions('selectable') : ''

        this.getChildren().forEach(async (com: ContainerComponent, index) => {
            if (!script && script !== '') {
                const data = await com.executeScript(script, {rowIndex: index})
                this.selectable.value[index] = data
            } else {
                this.selectable.value[index] = true
            }

        })
    }

    // 创建行
    // 1. 遍历subComponents 每一个子控件创建单元格，判断显隐
    // 2. 执行row-style脚本，切换定义主题
    createRow(com, rowIndex) {
        const SelectComponent = this.selectStyle.value === 'multiple' ? ElCheckbox : this.selectStyle.value === 'single' ? ElRadio : null
        if (this.showSelect.value && SelectComponent === null) {
            console.error(`table set showSelect but not set selectStyle`)
        }
        const rows = this.traverseRow(com)
        return rows.map((row, index) => {
            return <tr class='w-base-table__body-tr'>
                {
                    index === 0 && this.showSelect.value && SelectComponent ?
                        <td class={`w-base-table__body-td w-base-table_column-selection`} rowspan={rows.length}>
                            <div class={'w-base-table_td-cell'}><SelectComponent
                                disabled={!this.selectable.value[rowIndex]} key={com.dumpsValueState()[this.keyName]}
                                label={com.dumpsValueState()[this.keyName]}><br/></SelectComponent></div>
                        </td> : null
                }
                {
                    this.columns.value.filter(col => col.visible).map(col => {
                        const cell = row[col.id] ? row[col.id] : index === 0 ? {span: 1} : null
                        return this.createCell(cell, col)
                    })
                }
                {
                    index === 0 ? this.expendColData.value.map((col, colIndex) => {
                        const visibleList = this.expendColList.value[rowIndex] && this.expendColList.value[rowIndex][colIndex] ? this.expendColList.value[rowIndex][colIndex] : []
                        return <td
                            class={`w-base-table__body-td w-base-table_column-${col.id} w-base-table__${this.align}`}
                            rowspan={rows.length}>
                            <div class='w-base-table_td-cell'>
                                {col.render(com, rowIndex, visibleList)}
                            </div>
                        </td>
                    }) : null
                }
            </tr>
        })

    }

    // 创建单元格
    // 1. 执行cell-style脚本，切换定义主题
    createCell(com, col) {
        if (com === null) return null
        return <td align={this.align}
                   class={`w-base-table__body-td w-base-table_column-${col.id} w-base-table__${this.align}`}
                   rowspan={com.span}>
            <div class={'w-base-table_td-cell'}>{com.cell?.render()}</div>
        </td>
    }

    // 创建表尾合计行
    createFooter() {
        if (this.getOptions('show-summary')) {
            const summaryColumns = [...this.columns.value]
            if (!this.showSelect.value) {
                summaryColumns.shift()
            }
            return <div class={'w-base-table__wrapper w-base-table__foot-wrapper'}>
                <table class={'w-base-table__foot-table'}>
                    {
                        this.createColgroup()
                    }
                    <tfoot>
                    <tr class={'w-base-table__foot-tr'}>
                        <td class={`w-base-table_td w-base-table_column-selection w-base-table__${this.align}`}>
                            <div class='w-base-table_td-cell'>
                                {this.getOptions('sum-text') ? internation.translate(this.getOptions('sum-text')) : internation.translate('widget.sumText', '合计')}
                            </div>
                        </td>
                        {
                            summaryColumns.filter(col => col.visible).map(col => this.createFootCell(col))
                        }
                    </tr>
                    </tfoot>
                </table>
            </div>
        }
        return null
    }

    calculateSummary() {
        Object.keys(this.columnOptions.value).forEach(async (key: string) => {
            const method = this.columnOptions.value[key] ? this.columnOptions.value[key]['summary-method'] : ''
            if (method && method !== '') {
                const registerData = {data: this.dumpsValueState(), summary: []}
                if(this.parent() instanceof BaseQueryTable) {
                    registerData.summary = this.parent().dumpsValueState()['summary']
                }
                let total = await this.executeScript(method, registerData)
                const wcd = this._accessor.xPath(key)
                total = dataFormat.format(total, wcd.getOptions().format)
                this.columnOptions.value[key].summary = total

            }
        })
    }

    createFootCell(col) {
        return <td class={`w-base-table_td  w-base-table_column-${col.id} w-base-table__${this.align}`}>
            <div class={'w-base-table_td-cell'}>
                {this.columnOptions.value[col.id] ? this.columnOptions.value[col.id].summary : ''}
            </div>
        </td>
    }

    // 单选触发
    radioChange(value: string | number) {
        this.selectIdList.value[0] = value
        this.selectList.value = this.selectIdList.value.map(id => this.dumpsValueState().find(data => data[this.keyName] === id))
    }

    // 多选触发
    handelCheckBoxChange(value: Array<string | number>) {
        this.selectIdList.value = value
        this.selectList.value = this.selectIdList.value.map(id => this.dumpsValueState().find(data => data[this.keyName] === id))
        this.handelCheckAll()
    }

    // 多选校验
    handelCheckAll() {
        const allIds = this.dumpsValueState().filter((ele, index) => {
            return this.selectable.value[index]
        }).map(data => data[this.keyName])
        this.indeterminate.value = this.selectIdList.value.length > 0
        if (allIds.length > 0 && allIds.every((id: string | number) => this.selectIdList.value.includes(id))) {
            this.checkAll.value = true
            this.indeterminate.value = false
        } else {
            this.checkAll.value = false
        }

    }

    /**
     * 处理全选点击
     * @param value
     */
    handleSelectAllChange(value) {
        this.checkAll.value = value
        this.indeterminate.value = false
        if (value) {
            this.selectIdList.value = this.dumpsValueState().filter((ele, index) => {
                return this.selectable.value[index]
            }).map((data: Record<string, any>) => data[this.keyName])
        } else {
            this.selectIdList.value = []
        }
        this.selectValue.value = this.selectIdList.value
    }

    private visible = reactive({value: false})

    createActionBar() {
        const visibleList = reactive({value: this.columns.value.filter(col => col.visible).map(ele => ele.label)})
        return <div class={'w-base-table__action-bar'}>
        </div>
    }

    // 根据选择配置可见列
    changeVisible(list) {
        this.columns.value = this.columns.value.map(col => {
            const column = list.find(ele => ele.id === col.id)
            if (column) {
                const visible = column.visible
                const order = column.order
                return {...col, visible, order}
            }
            return col
        }).sort((pre, next) => {
            return next.order - pre.order
        })
        this.visible.value = false
    }

    // 创建拖拽监听
    // 1. 为拖拽元素添加鼠标点击监听
    // 2. 为拖拽元素添加鼠标移动监听
    //     1. 通过拖拽元素查询到对应的列
    // 3. 为拖拽元素添加鼠标抬起监听
    initResize(e) {
        const that = this
        let resizeHandle = e.target
        let startX = e.clientX
        const name = resizeHandle.attributes['drag-name'].value
        const table = document.querySelector(`.w-base-table__${that.uuid()}`) as HTMLDivElement
        table.style['user-select'] = 'none'
        const dragLine = document.querySelector(`.w-base-table__${that.uuid()} .w-base-table__column-resize-proxy`) as HTMLDivElement
        dragLine.style.display = 'block'
        dragLine.style.left = startX - table.getBoundingClientRect().x + 'px'
        const colList: NodeListOf<HTMLTableColElement> = document.querySelectorAll(`.w-base-table__${that.uuid()} .w-base-table__col[col-name=${name}]`)
        let startWidth = 0
        colList.forEach(node => {
            startWidth = parseInt(node.width)
        })
        document.documentElement.addEventListener('mousemove', doResize, false)
        document.documentElement.addEventListener('mouseup', stopResize, false)
        // 拖拽实时修改列宽
        // 1. 计算移动距离(向左-， 向右+)
        // 2. 计算该列后几列宽度(平均分配,向左+， 向右-)
        function doResize(e) {
            if (resizeHandle) {
                dragLine.style.left = e.clientX - table.getBoundingClientRect().x + 'px'
            }
        }

        // 停止拖拽监听
        // 2. 移除移动监听
        // 3. 移除鼠标抬起监听
        function stopResize(e) {
            dragLine.style.display = 'none'
            let newWidth = startWidth + e.clientX - startX
            if (newWidth < 120) {
                newWidth = 120
            }
            colList.forEach(node => {
                node.width = newWidth.toString()
            })
            that.columns.value.forEach(col => {
                if (col.id === name) {
                    col.width = newWidth
                }
            })
            table.style['user-select'] = 'auto'
            document.documentElement.removeEventListener('mousemove', doResize, false)
            document.documentElement.removeEventListener('mouseup', stopResize, false)
            that.setColWidth()
            resizeHandle = null
            startX = null
            startWidth = null
        }
    }

    onTableResize() {
        this.setColWidth()
    }

    setColWidth() {
        const head = document.querySelector(`.w-base-table__${this.uuid()}`)
        const fixedWidth = this.colOptions.value.reduce((pre, next) => {
            if (next.visible && Number.isInteger(next.width)) {
                return pre + next.width
            }
            return pre
        }, 0)
        const remainingWidth = head.clientWidth - fixedWidth - 10
        const column = this.columns.value.filter(col => col.visible && !Number.isInteger(col.width))
        column.push(...this.expendColData.value.filter(col => col.visible && !Number.isInteger(col.width)))
        const commonWidth = Math.floor(remainingWidth / column.length) > 120 ? Math.floor(remainingWidth / column.length) : 120
        column.forEach(col => {
            const headerCell = document.querySelector(`.w-base-table__${this.uuid()} .w-base-table_th + .w-base-table_column-${col.id}`) as HTMLTableCellElement
            const headerWidth = headerCell ? (headerCell.firstElementChild as HTMLDivElement).offsetWidth : 0
            const colList: NodeListOf<HTMLTableColElement> = document.querySelectorAll(`.w-base-table__${this.uuid()} .w-base-table__col[col-name=${col.id}]`)
            const realWidth = headerWidth > commonWidth ? headerWidth : commonWidth
            colList.forEach(node => node.width = realWidth.toString() + 'px')
        })
        this.setFixed(commonWidth, this.colOptions.value, 'left')
        this.setFixed(commonWidth, [...this.colOptions.value].reverse(), 'right')
    }

    // 设置固定列
    setFixed(commonWidth: number, list: Array<column>, position: string) {
        let distance = 0
        const columnsList: Array<{ columns: NodeListOf<HTMLTableCellElement>, distance: number }> = []
        list.forEach(col => {
            if (exists(this.columnOptions.value, col.id) || col.id === 'handle') {
                let options = this.columnOptions.value[col.id]
                if (col.id === 'handle') {
                    options = {fixed: 'right'}
                }
                if (exists(options, 'fixed') && options['fixed'] === position) {
                    const colList: HTMLTableColElement = document.querySelector(`.w-base-table__${this.uuid()} .w-base-table__col[col-name=${col.id}]`)
                    const columns: NodeListOf<HTMLTableCellElement> = document.querySelectorAll(`.w-base-table__${this.uuid()} .w-base-table_column-${col.id}`)
                    columns.forEach(node => {
                        if (!node.className.includes(`col-fixed-${position}`))
                            node.className = node.className + ' ' + `col-fixed-${position}`
                        node.style.position = 'sticky'
                        node.style[position] = distance + 'px'
                        node.style['z-index'] = 9
                    })
                    const width = col.width ? col.width : parseInt(colList.width)
                    columnsList.push({columns, distance})
                    distance = distance + width
                }
            }
        })
        const edge = columnsList.reduce((pre, next) => {
            if (pre.distance < next.distance) return next
            return pre
        }, columnsList[0])
        if (edge) {
            edge.columns.forEach((node => {
                if (!node.className.includes(`col-fixed-${position}__shadow`))
                    node.className = node.className + ' ' + `col-fixed-${position}__shadow`
            }))
        }

    }

    updateHandle(width: number) {
        if (this.expendColData.value[0]) {
            this.expendColData.value[0].width = width
            const colList: NodeListOf<HTMLTableColElement> = document.querySelectorAll(`.w-base-table__${this.uuid()} .w-base-table__col[col-name=handle]`)
            colList.forEach(node => {
                node.width = width.toString()
            })
        }
    }

    // table 渲染方法
    render() {
        if (!this._accessor.getVisible()) {
            return 
        }
        return <BaseTableContainer uuid={this.uuid()} columns={this.columns.value} onTable-resize={() => {
            // this.onTableResize()
        }} rowLength={this.dumpsValueState().length} onHandle-create={(width: number) => {
            this.updateHandle(width)
        }}>
            {
                this.createActionBar()
            }
            <div class="operation-btn">
                {
                    this.showConfig.value ? <el-icon size="16px" onClick={() => {this.showConfig.value = false; this.animationClasss.value = 'hide-panel'}} style="cursor: pointer;"><Close></Close></el-icon> :
                    <el-tooltip class="item" effect="dark" content={internation.translate('widget.explicit.implicit.column', '显隐列')} placement="top">
                        <div class="svg-box" onClick={() => {this.showConfig.value = true; this.animationClasss.value = 'show-panel'}}><el-image size="small" style="height: 16px; width: 16px; cursor: pointer;" src={showHide} circle/></div>
                    </el-tooltip>
                }
            </div>
            <div style="display: flex; height: 100%;">
                <div style="overflow: hidden; height: 100%;">
                    {
                        this.createHeader()
                    }
                    {
                        this.createBody()
                    }
                </div>
                <div class={['config-panel', this.animationClasss.value]}>
                    <div class="config-header">
                        {internation.translate('widget.tip', '配置')}
                        <el-tooltip content={internation.translate('widget.tip', '提示') + ':' + internation.translate('widget.table.dragTips', '可以通过拖拽行的上下位置实现列排序更改')}  placement="top" effect="light">
                            <QuestionFilled width="16px" style="margin-left: 4px;" />
                        </el-tooltip>
                    </div>
                    <div class="config-main">
                        <VisibleOrderTable columns={this.columns.value} onUpdateColumns={(list: Array<column>) => { console.log(list); this.columns.value = [...list];}}></VisibleOrderTable>
                    </div>
                </div>
            </div>
            {
                this.createFooter()
            }
        </BaseTableContainer>
    }
}

defineWidget('table', (parent) => new BasicTable(parent))