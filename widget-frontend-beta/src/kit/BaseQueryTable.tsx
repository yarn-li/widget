import {
    ContainerComponent,
    defineWidget, internation,
    TemplateObject,
    WidgetAccessor,
    WidgetComponent
} from "@widget-frontend/widget-frontend-core";
import {BasicTable} from "./BasicTable.tsx";
import QueryContent from "./components/QueryContent.vue"
import {reactive, watch} from "vue";
import BaseQueryTableContent from "./components/BaseQueryTable.vue"
import "../style-css/baseQueryTable.css"
import {LoadingService} from "@widget-frontend/widget-frontend-luna";
import {exists} from "../basic/utils/comm.ts";

export class BaseQueryTable extends ContainerComponent {
    private authControl: Record<string, any> = reactive({value: false})
    // 分页器信息
    private page = reactive({
        pageNum: 1,
        pageSize: 20,
        total: 0
    })
    // 页面容量
    private sizeLise: Array<number> = [20, 40, 60, 80, 100]
    // 套件schema
    private _access: WidgetAccessor
    // 查询表单实例
    private conditionForm: ContainerComponent
    // 总结容器实例
    private summary: ContainerComponent
    // 表格实例
    private table: BasicTable
    // 按钮配置
    private actionBarOperations: Array<{id:string, label: string, scripts: Array<string>, type: string, style: string, isAvailable: Array<string>}>  = []
    private columnOperations: Array<{id: string, label: string, scripts: Array<string>, type: string, style: string, isAvailable: Array<string>}>  = []
    // 表格是否显示多选框
    private showSelection: boolean = false
    // 排序类型
    private sortStyle: string = "origin"
    // 排序信息
    private sortable: Array<{name: string, order: string}> = []
    // 查询脚本
    private queryScripts: Array<string> = []
    // 列表选中项信息
    private selectionList: Record<string, any> = reactive({value: []})
    // 列表选中项信息
    private selectionIdList: Record<string, any> = reactive({value: []})
    private loading: LoadingService = null
    private immediateRefresh: Record<string, any> = reactive({value: true})
    setAccessor(value) {
        this._access = value
    }

    showLoading() {
        this.loading.showLoading()
    }

    closeLoading() {
        this.loading.closeLoading()
    }

    componentCreated() {
        super.componentCreated();
        this._access = this.getVueViewDriver().access(this)
        this.actionBarOperations =  this._access.getOptions()['actionBarOperations'] ? this._access.getOptions()['actionBarOperations'] : []
        this.columnOperations =  this._access.getOptions()['columnOperations'] ? this._access.getOptions()['columnOperations'] : []
        this.showSelection = this._access.getOptions()['showSelection'] ? this._access.getOptions()['showSelection'] : false
        this.queryScripts = this._access.getOptions()['queryScripts'] ? this._access.getOptions()['queryScripts'] : []
        this.sortStyle = this._access.getOptions()['sortStyle'] ? this._access.getOptions()['sortStyle'] : 'origin'
        this.sortable = this._access.getOptions()['sortable'] ? this._access.getOptions()['sortable'] : []
        this.immediateRefresh.value = this._access.getOptions()['immediateRefresh'] ? this._access.getOptions()['immediateRefresh'] : false
    }

     override componentMounted() {
         super.componentMounted();
         if(!this.getSubcomponent('conditionForm'))
             throw new Error("base-query-table lack of property conditionForm")
         this.conditionForm = this.getSubcomponent('conditionForm') as ContainerComponent
         this.summary = this.getSubcomponent('summary') as ContainerComponent
         if(!this.getSubcomponent('table'))
             throw new Error("base-query-table lack of property table")
         this.table = this.getSubcomponent('table') as BasicTable
         this.initTable()
         this.queryDetail()
         if (this.immediateRefresh.value) {
             const timer = reactive({value: null})
             watch(this.conditionForm.getVueViewDriver().access(this.conditionForm).getWcd(), (value) => {
                 if (timer.value) {
                     clearTimeout(timer.value)
                 }
                 timer.value = setTimeout(() => {
                     this.refresh(1)
                     clearTimeout(timer.value)
                 }, 100)
             })
         }

    }

    collectSources(schema, resourceId) {
         const access = WidgetAccessor.access(schema)
         const actionBarOperations = access.getOptions()['actionBarOperations']
         const columnOperations = access.getOptions()['columnOperations']
         const actionSource = actionBarOperations.map(ele => {
            return {
                "permType": "ELEMENT",
                "perm": resourceId + `_actionBarOperation_${ele.id}`,
                "remark": ele.label,
                "children": []
            }
         })
         const columnSource = columnOperations.map(ele => {
            return {
                "permType": "ELEMENT",
                "perm": resourceId + `_columnOperation_${ele.id}`,
                "remark": ele.label,
                "children": []
            }
         })
         return [...actionSource, ...columnSource]
    }

    /**
     * 初始化表格
     * @private
     */
    private initTable() {
        this.table.setShowSelection(this.showSelection)
        this.table.setSortStyle(this.sortStyle)
        this.table.setSortable(this.sortable)
        this.sortable = this.table.getSortData.value
        this.expendHandel()
        watch(this.table.getSelectIdList, (val) => {
            this.selectionIdList.value = val
            this.selectionList.value = this.table.dumpsValueState().filter(ele => this.selectionIdList.value.includes(ele[this.table.getKey()]))
        },{deep: true})
        watch(this.table.getSortData, (val) => {
            this.sortable = val
            this.refresh()
        },{deep: true})
        watch(this.selectionIdList, (val) => {
            const isChange = this.selectionIdList.value.length === this.selectionList.value.length && this.selectionList.value.every(ele => this.selectionIdList.value.includes(ele[this.table.getKey()]))
            if (!isChange) {
                this.selectionList.value = this.table.dumpsValueState().filter(ele => val.value.includes(ele[this.table.getKey()]))
            }
            const flag = this.table.getSelectIdList.value.length === this.selectionIdList.value.length && this.table.getSelectIdList.value.every(ele => this.selectionIdList.value.includes(ele))
            if (!flag) {
                this.table.setSelectList(this.selectionList.value)
            }
        },{deep: true})
        watch(this.selectionList, (val) => {
            const isChange = this.selectionIdList.value.length === this.selectionList.value.length && this.selectionList.value.every(ele => this.selectionIdList.value.includes(ele[this.table.getKey()]))
            if (!isChange) {
                this.selectionIdList.value = val.value.map(ele => ele[this.table.getKey()])
            }
            const flag = this.table.getSelectIdList.value.length === this.selectionIdList.value.length && this.table.getSelectIdList.value.every(ele => this.selectionIdList.value.includes(ele))
            if (!flag) {
                this.table.setSelectList(val.value)
            }
        },{deep: true})
    }

    getProperty(name: string) {
        if (['selectionList', 'selectionIdList'].includes(name)) {
            return this[name].value
        }
        return this[name]
    }

    setProperty(name: string, value: any) {
        if (['selectionList', 'selectionIdList'].includes(name)) {
            this[name].value = value
        } else {
            this[name] = reactive(value)
        }
    }

    getResourcesId() {
        const schema = this.getVueViewDriver().OpenApiManager.getSchema()
        if(!exists(schema['info'], 'x-id')) {
            throw new Error('schema info lack of x-id')
        }
        return schema['info']['x-id']
    }

    /**
     * 创建操作列
     */
    private expendHandel() {
        const that = this
        if (that.columnOperations.length > 0) {
            this.table.expendCol({
                id: 'handle',
                label: internation.translate('widget.handel', '操作'),
                width: null,
                visible: true,
                render(row: ContainerComponent, index: number, visibleList: Array<boolean>) {
                    return  <div class="line" style="display: flex">
                        {
                            that.columnOperations.map((option, index) => {
                                if(visibleList.length > index && visibleList[index]) {
                                    return that.authControl.value ? <el-button v-hasPermi={that.getResourcesId() + "_columnOperation_" + option.id} type={option.style || 'primary'} link={!option.type || option.type === 'text'} onClick={() => {row.executeScripts(option.scripts, {refresh: (com, ...args) => {(com.parent().parent() as BaseQueryTable).refresh(args[0])}})}}>{option.label}</el-button> :
                                        <el-button type={option.style || 'primary'} link={!option.type || option.type === 'text'} onClick={() => {row.executeScripts(option.scripts, {refresh: (com, ...args) => {(com.parent().parent() as BaseQueryTable).refresh(args[0])}})}}>{internation.translate(option.label)}</el-button>
                                } else {
                                    //todo 操作列可用按钮对齐
                                    // return <div class={'disabled-btn'}><el-button  type={'info'} link={option.type === 'text'}>{option.label}</el-button></div>
                                    return null
                                }
                            })
                        }
                    </div>
                },
                async isAvailable(row) {
                    const promiseList =  that.columnOperations.map(async (col) => {
                            if (Array.isArray(col.isAvailable) && col.isAvailable.length > 0) {
                                const executeList = col.isAvailable.map(async (script) => {
                                    return await row.executeScript(script)
                                })
                                return Promise.all(executeList)
                            } else {
                                return true
                            }
                    })
                    const result = await Promise.all(promiseList)
                    return result.map(item => {
                        if (Array.isArray(item)) {
                            return item.every(flag => flag === true)
                        } else {
                            return  item
                        }
                    })
                }
            })
        }

    }

    /**
     * 查询也页面详情
     * @private
     */
    private async queryDetail() {
        await this.executeScripts(this.queryScripts, {refresh: (com: BaseQueryTable, ...args) => {com.refresh(args[0])}})
    }

    /**
     * 重新发送查询请求
     */
    refresh(pageNum?: number) {
        if (pageNum) {
            this.page.pageNum = pageNum
        }
        this.queryDetail()
    }

    /**
     * 创建表头按钮列表
     * @private
     */
    private createHeaderOperation() {
        return this.actionBarOperations.map(option =>
            this.authControl.value ? <el-button v-hasPermi={this.getResourcesId() + "_actionBarOperation_" + option.id} type={option.style || 'info'} link={option.type === 'text'} onClick={() => {this.executeScripts(option.scripts, {refresh: (com: BaseQueryTable) => {com.refresh()}})}}>{option.label}</el-button> :
                <el-button type={option.style || 'info'} link={option.type === 'text'} size={'small'} onClick={() => {this.executeScripts(option.scripts, {refresh: (com: BaseQueryTable) => {com.refresh()}})}}>{internation.translate(option.label)}</el-button>
        )
    }

    /**
     * 页码切换
     * @param pageNum
     * @private
     */
    private currentChange(pageNum: number) {
        this.page.pageNum = pageNum
        this.refresh()
    }

    /**
     * 页码改变
     * @param pageSize
     * @private
     */
    private sizeChange(pageSize: number) {
        this.page.pageNum = 1
        this.page.pageSize = pageSize
        this.refresh()

    }

    override render() {
        return <BaseQueryTableContent onCreated={(authControl) => {this.authControl.value = authControl}}>
            <QueryContent  class='query-table__conditionForm' onSearchBtnClick={() => {this.page.pageNum = 1; this.queryDetail()}}>
                {
                    this.conditionForm.subviews().map((node) => {
                        if (node) {
                            return <div class="width-base" style="padding-right: 10px; box-sizing: border-box;">
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
                this.actionBarOperations.length > 0 ?   <div class='query-table__actionBar'>
                    {
                        this.createHeaderOperation()
                    }
                </div> : null
            }
            <div class="query-table__summary">
                {
                    this.summary ? this.summary.subviews().map((node) => {
                        if (node) {
                            return <div class="col-xs-12 col-sm-6 col-md-4 col-lg-3">
                                {
                                    node
                                }
                            </div>
                        }
                        return null
                    }) : null
                }
            </div>

            <div class='query-table__table'>
                {
                    this.table.render()
                }
            </div>
            <div class='query-table__pagination'>
                <el-pagination
                    current-page={this.page.pageNum}
                    page-size={this.page.pageSize}
                    page-sizes={this.sizeLise}
                    onCurrentChange={(pageNum: number) => { this.currentChange(pageNum) }}
                    onSizeChange={(pageSize: number) => { this.sizeChange(pageSize) }}
                    layout='total, sizes, prev, pager, next, jumper'
                    total={this.page.total}
                    background
                >
                </el-pagination>
            </div>
        </BaseQueryTableContent>
    }
}

defineWidget('base-query-table', (parent) => new BaseQueryTable(parent))