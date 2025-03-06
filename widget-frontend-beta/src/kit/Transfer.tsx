import {reactive, ref, watch} from 'vue';
import {
    WidgetComponent,
    ContainerComponent,
    WidgetAccessor,
    defineWidget,
    DynamicContainerComponent,
    VueViewDriver,
    exists, internation
} from "@widget-frontend/widget-frontend-core";
import {LoadingService, message, openDialog} from '@widget-frontend/widget-frontend-luna';
import '../style-css/simple_crud.css'
import { BasicTable } from "./BasicTable.tsx";
import QueryContent from "./components/QueryContent.vue";
import { Plus } from '@element-plus/icons-vue'
import "../style-css/transfer.css"
import TransferContent from './components/Transfer.vue';
type Page = {
    pageNum: number,
    pageSize: number,
    total: number
}

/**
 * The WidgetComponent definition
 */
export class Transfer extends DynamicContainerComponent {

    /** Represent value */
    private _state: Record<string, any>;
    /** For Widget attribute accessing */
    private _accessor: WidgetAccessor = null;
    /** pagination info */
    private page: Page = reactive({
        pageNum: 1,
        pageSize: 20,
        total: 0
    })
    /**  */
    private sizeLise: Array<number> = [20, 40, 60, 80, 100]
    /** table components instance */
    private tableItem: BasicTable
    private selectionTable: BasicTable
    private selectStyle: string = ''
    private loading: LoadingService = null

    // ------------------------------------------------------
    override componentCreated() {
        this._accessor = this._vvd.access(this)
        this._state = reactive({ value: this.dumpsValueState() })
        if(!exists(this._accessor.getOptions(), 'selectStyle'))
            throw new Error("transfer options lack of selectStyle")
        this.selectStyle = this._accessor.getOptions()['selectStyle']
        super.componentCreated()
    }
    override componentMounted() {
        super.componentMounted()
        this.initTable()
        this.loading = new LoadingService({global: false, target: `.x-base-table__${this.selectionTable.uuid()}`, text: internation.translate('widget.dataLoading', '数据加载中'), mask: true})
        this.queryDetail(false)

    }

    proxySchema(wcd: Record<string, any>) {
        return wcd
    }

    /**
     * 初始化table
     * @param apiName
     */
    existsApi(apiName: string): boolean {
        return exists(this._accessor.getOptions()['api'], apiName)
    }

    /**
     * 初始化表格
     */
    initTable() {
        this.tableItem = this.getChildrenByPath(this.xpath() + '/selectList') as BasicTable
        this.createSelectionList()
        if (!this.tableItem)
            throw new Error(`${this.xpath()} properties lack of table`)
        if (this.tableItem instanceof BasicTable) {
            const that = this
            this.tableItem.expendCol({id: 'handle', name:internation.translate('widget.handel', '操作'), render(row: ContainerComponent, index: number) {
                    return  <div class="line" style={'width: 80px'}>
                            <el-button onClick={() => {
                                that.deleteRow(row, index)
                            }}>{internation.translate('widget.delete', '删除')}</el-button>
                    </div> }})
        }
    }

    getChildrenByPath(path: string) {
        return this._children.find(ele => ele.xpath() === path)
    }

    /**
     * 创建query
     * @returns
     */
    createHeader() {
        return (this.getChildrenByPath(this.xpath() + '/query') as ContainerComponent).subviews()
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
     * 删除数据
     * @param row
     */
    async deleteRow(row: ContainerComponent, index: number) {
        this.tableItem.spliceSubComponents(index, 1)
        this.selectionTable.setSelectList(this.dumpsValueState()['selectList'])
        this.render()
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
        this.getApi('queryMany')(this.page, this.getChildrenByPath(this.xpath() + '/query').dumpsValueState()).then(res => {
            this.setData(res)
        })
    }
    /**
     * query table data
     */
    showLoading() {
        this.loading.showLoading()
    }

    closeLoading() {
        this.loading.closeLoading()
    }

    queryDetail(showLoading?: boolean) {
        if(showLoading !== false)
            this.showLoading()
        this.getApi('queryMany')(this.page, this.getChildrenByPath(this.xpath() + '/query').dumpsValueState()).then(res => {
            this.setData(res)
            if(showLoading !== false)
                this.closeLoading()
        })
    }

    /**
     * set data by options
     * @param data
     */
    setData(data: Record<string, any>) {
        const options = {
            selectionTable: '$entities',
            page: '$page',
        }

        Object.keys(options).forEach((key: string) => {
            if (exists(this, key)) {
                if (this[key] instanceof BasicTable) {
                    this[key].reload(data[options[key].replace('$', '')])
                } else {
                    this[key] = data[options[key].replace('$', '')]
                }
            }
        })
        this.selectionTable.setSelectList(this._state.value['selectList']);
    }

    /**
     * return api function by name
     * @param name
     * @returns
     */
    getApi(name: string) {
        this.getVueViewDriver()
        return this.getVueViewDriver().OpenApiManager.getHttpFunctions()[this._accessor.getOptions()['api'][name].operationId]
    }

    createSelectionList() {
        const s = this.getVueViewDriver().OpenApiManager.createObject(this.getVueViewDriver().wcd(this.tableItem.uuid()), null)
        this.selectionTable = this.createComponentBySchema(s, this.uuid(), this.xpath() + '/selectionTable') as BasicTable;
        (this.selectionTable as BasicTable).setShowSelection(true);
        this.selectionTable.setSelectStyle(this.selectStyle)
        watch(this.selectionTable.getSelectList, (val) => {
            this.tableItem.reload(val)
        })
    }


    /** The core render function */
    override render() {
        return <TransferContent uuid={this.uuid()}>
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
            <div class="selection-table">
                {
                    this.selectionTable.render()
                }

            </div>
            <div class={'crud-pagination'} style="margin: 20px 0">
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
            {
                this._accessor.getOptions()['showSelected'] ? <div class="select-table">
                    {
                        this.tableItem.render()
                    }
                </div> : null
            }
        </TransferContent>;
    }
}
/**
 * After defining WidgetComponent, you should register the related component type!
 * @note If you didn't register the component type, the framework cannot grab the Component class information.
 *       The framework will not provide the necessary exception information for you when error occur.
 */
defineWidget('transfer', (parent: WidgetComponent) => new Transfer(parent))