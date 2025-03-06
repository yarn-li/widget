import { reactive } from 'vue';
import { WidgetComponent, ContainerComponent, WidgetAccessor, defineWidget, DynamicContainerComponent, exists } from "@widget-frontend/widget-frontend-core";
import { message, openDialog } from '@widget-frontend/widget-frontend-luna';
import SimpleCrudContent from './components/SimpleCrud.vue'

import '../style-css/simple_crud.css'
import { BasicTable } from "./BasicTable.tsx";
import QueryContent from "./components/QueryContent.vue";
import { Plus } from '@element-plus/icons-vue'



/**
 * The WidgetComponent definition
 */
export class SimpleCrud extends ContainerComponent {
    
    /** Represent value */
    private _state: Record<string, any>;
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    /** pagination info */
    private page = reactive({
        pageNum: 1,
        pageSize: 20,
        total: 0
    })
    /**  */
    private sizeLise: Array<number> = [20, 40, 60, 80, 100]
    /** table components instance */
    tableItem: BasicTable

    private expendButtonList: Array<Record<string, any>> = reactive([])

    // ------------------------------------------------------
    override componentCreated() {
        this._accessor = this._vvd.access(this)
        this._state = reactive({ value: this.dumpsValueState() })
    }
    override componentMounted() {
        this.initTable()
        this.queryDetail()

    }
    override componentBeforeDestroy() {

    }

    getTableItem() {
        return this.tableItem
    }

    /**
     * 初始化table
     * @param apiName
     */
    existsApi(apiName: string): boolean {
        return exists(this._accessor.getOptions()['api'], apiName)
    }


    setTaleSelection() {
        if (this.existsApi('deleteMany')) {
            (this.tableItem as BasicTable).setShowSelection(true)
        }
    }

    initTable() {
        this.tableItem = this.getChildrenByPath(this.xpath() + '/tableItem') as BasicTable
        if (!this.tableItem) 
            throw new Error(`${this.xpath()} properties lack of table`)
        if (this.tableItem instanceof BasicTable) {
            this.setTaleSelection()
            this.tableItem.setSortStyle(this._accessor.getOptions()['sortStyle'])
            const that = this
            this.expendHandel(that)
        }
    }

    expendHandel(that) {
    if (that.existsApi('addOne') || that.existsApi('deleteOne') || that.existsApi('queryDetail'))
        (that.tableItem as BasicTable).expendCol({id: 'handle', label:'操作',  width: null,
            visible: true, render(row: ContainerComponent) {
                return  <div class="line">
                    {
                        that.existsApi('addOne') ? <el-button link={true} type='primary' onClick={() => {
                                that.editRow(row)
                            }}>编辑</el-button>
                            : null
                    }
                    {
                        that.existsApi('deleteOne') ? <el-button link={true} type='primary' onClick={() => {
                            that.deleteRow(row)
                        }}>删除</el-button> : null
                    }
                    {
                        that.existsApi('queryDetail') ? <el-button link={true} type='primary' onClick={() => {
                                that.viewDetail(row)
                            }}>查看详情</el-button>
                            : null
                    }
                </div> }})
    }

    createBtn(that: SimpleCrud) {
        return <el-button onClick={() => {that.executeCommand()}}></el-button>
    }

    executeCommand() {

    }

    getChildrenByPath(path: string) {
        return this._children.find(ele => ele.xpath() === path)
    }

    /**
     * 创建query
     * @returns 
     */
    createHeader() {
        return (this.getChildrenByPath(this.xpath() + '/conditionForm') as ContainerComponent).subviews()
    }

    /**
     * 创建主表
     * @returns 
     */
    createTable() {
        return this.tableItem.render()
    }

    /**
     * 切换页码
     * @param pageNum 页码
     */
    currentChange(pageNum: number) {
        this.page.pageNum = pageNum
        this.queryDetail()
    }

    /**
     * 切换页面容量
     * @param pageSize 页面容量 
     */
    sizeChange(pageSize: number) {
        this.page.pageSize = pageSize
        this.queryDetail()
    }

    /**
     * 新增数据
     */
    async addRow() {
        const that = this
        await openDialog(this, '/newForm', null, null,
            async (data) => {
                if (data.action === 'confirm') {
                    const res = await that.getApi('addOne')(data.data)
                    if (res.entity) {
                        message('success', '新增成功')
                        that.refresh()
                        return true
                    } else {
                        message('error', '新增失败')
                        return false
                    }

                }
                return true
            })
    }

    /**
     * 编辑数据
     * @param row 
     */
    async editRow(row: ContainerComponent) {
        const that = this
        const rowData = row.dumpsValueState()
        const res = await this.getApi('queryOne')(rowData[this.tableItem.getKey()])
        await openDialog(this, '/editForm', res.entity, null, async (data) => {
           if (data.action === 'confirm') {
               const res = await that.getApi('editOne')(data.data)
               if (res.entity) {
                   message('success', '编辑成功')
                   that.refresh()
                   return true
               } else {
                   message('error', '编辑失败')
                   return false
               }
           }
           return true
        })
    }

    /**
     * 查询详情
     * @param row 
     */
    async viewDetail(row: ContainerComponent) {
        const rowData = row.dumpsValueState()
        const res = await this.getApi('queryDetail')(rowData[this.tableItem.getKey()])
        await openDialog(this, '/detailForm', res.entity, null)
    }

    /**
     * 删除数据
     * @param row 
     */
    async deleteRow(row: ContainerComponent) {
        const rowData = row.dumpsValueState()
        const res = await this.getApi('deleteOne')(rowData[this.tableItem.getKey()])
        if (res.entity) {
            this.page.pageNum = 1
            this.queryDetail()
            message('success', '删除成功')
        } else {
            message('error', '删除失败')
        }

    }

    /**
     * 批量删除
     */
    async batchDelete() {
        if ((this.tableItem as BasicTable).getSelectIdList.value.length === 0) {
            message('warning', '请至少选择一条数据')
        } else {
            const res = await this.getApi('deleteMany')((this.tableItem as BasicTable).getSelectIdList.value)
            if (res.entity) {
                this.page.pageNum = 1;
                (this.tableItem as BasicTable).reload([])
                this.queryDetail()
                message('success', '删除成功')
            } else {
                message('error', '删除失败')
            }
        }
    }   

    /**
     * 导出
     */
    export() {
        this.getApi('download')(this.getChildrenByPath(this.xpath() + '/conditionForm').dumpsValueState())
    }

    /**
     * 刷新页面
     */
    refresh() {
        this.search()
    }

    /**
     * search button click
     */
    search() {
        this.page.pageNum = 1
        this.getApi('queryMany')(this.page, {}, this.getChildrenByPath(this.xpath() + '/conditionForm').dumpsValueState()).then(res => {
            this.setData(res)
        })  
    }
    /**
     * query table data
     */
    queryDetail() {
        this.getApi('queryMany')(this.page, {sort: (this.tableItem as BasicTable).getSortData.value}, this.getChildrenByPath(this.xpath() + '/conditionForm').dumpsValueState()).then(res => {
            this.setData(res)
        })  
    }

    /**
     * set data by options
     * @param data 
     */
    setData(data: Record<string, any>) {
        const options = {
            tableItem: '$entities',
            page: '$page',
        }

        Object.keys(options).forEach((key: string) => {
            if (exists(this, key)) {
                if (this[key] instanceof DynamicContainerComponent) {
                    this[key].reload(data[options[key].replace('$', '')])
                } else {
                    this[key] = data[options[key].replace('$', '')]
                }
            }
        })
    }

    /**
     * return api function by name
     * @param name 
     * @returns 
     */
    getApi(name: string) {
        return this.getVueViewDriver().OpenApiManager.getHttpFunctions()[this._accessor.getOptions()['api'][name].operationId]
    }

    /**
     * create handle button
     */
    createButtons() {
        const that = this
        return <div class={'button-list'}>
            { this.existsApi('addOne') ? <el-button icon={Plus} type="success" onClick={() => { this.addRow() }}>新增</el-button> : null }
            { this.existsApi('deleteMany') ?  <el-button type="danger" onClick={() => { this.batchDelete() }}>批量删除</el-button> : null }
            { this.existsApi('download') ?  <el-button type="info" onClick={() => { this.export() }}>导出</el-button> : null }
            { this.expendButtonList.map(ele => ele.render()) }
        </div>
    }

    expendButtons(data) {
        this.expendButtonList.push(data)
    }


    /** The core render function */
    override render() {
        if (!this._accessor.getVisible()) return null
        return <SimpleCrudContent uuid={this.uuid()}>
             <QueryContent  class={['crud-query']} onSearchBtnClick={() => {this.search()}}>
                {
                    this.createHeader().map((node) => {
                        if (node) {
                            return <div class="col-xs-12 col-sm-6 col-md-4 col-lg-3">
                                {
                                    node
                                }
                            </div>
                        }
                        return null
                    })
                }
             </QueryContent>
            {
                this.createButtons()
            }
            <div class={'crud-table'}>
                {
                    this.createTable()
                }
            </div>
            <div class={'crud-pagination'}>
                <el-pagination
                    current-page={this.page.pageNum}
                    page-size={this.page.pageSize}
                    page-sizes={this.sizeLise}
                    onCurrentChange={(pageNum: number) => { this.currentChange(pageNum); }}
                    onSizeChange={(pageSize: number) => { this.sizeChange(pageSize); }}
                    layout='total, sizes, prev, pager, next, jumper'
                    total={this.page.total}
                    background
                ></el-pagination>
            </div>
        </SimpleCrudContent>;
    }
}

defineWidget('simple_crud', (parent: WidgetComponent) => new SimpleCrud(parent))