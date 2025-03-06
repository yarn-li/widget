import {BasicTable} from "./BasicTable.tsx";
import {
    ContainerComponent,
    defineWidget,
    WidgetComponent,
    exists,
    WidgetAccessor,
    internation
} from "@widget-frontend/widget-frontend-core";
import  '../style-css/table-form.css'
import {reactive} from "vue";
import { ElMessage } from 'element-plus';

export class TableForm extends BasicTable {

    private showAddButton: {value: boolean} = reactive({value: true})
    private showDeleteButton: {value: boolean} = reactive({value: true})
    private showCopyButton: {value: boolean} = reactive({value: true})
    componentCreated() {
        super.componentCreated();
        this.showAddButton.value = this.getOptions('showAddButton') !== false
        this.showDeleteButton.value = this.getOptions('showDeleteButton') !== false
        this.showCopyButton.value = this.getOptions('showCopyButton') !== false
        this.createHandle()
    }

    override componentMounted() {
        const that = this
        super.componentMounted();
        window.addEventListener('paste', (event) => {this.handelPaste(event, that)})
    }

    override componentBeforeDestroy(): void {
        const that = this
        window.removeEventListener('paste', (event) => {this.handelPaste(event, that)})
    }

    async handelPaste(e, that) {
        let parent = e.target.parentNode
        let targetNode = null
        while (targetNode === null && parent) {
            if (parent.className === 'table-form') {
                targetNode = parent
            } else {
                // do something with parent
                parent = parent.parentNode;
            }

        }
        
        if (targetNode !== null) {
            that.pastData(e, that)
        }
    }

    async pastData(e, that) {
        const html = e.clipboardData.getData('text/html');
        const $doc = new DOMParser().parseFromString(html,'text/html');
        const rows = Array.from($doc.querySelectorAll('table tr')).map(tr => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.innerText)
        });
        let schema = this.getAccessor().getItems()
        if (exists(schema, '$ref')) {
            schema = this.getVueViewDriver().OpenApiManager.query(schema)
        }
        const access =  WidgetAccessor.access(schema)
        let keys = Object.keys(access.getProperties()); // key的名
        keys = keys.filter(key => {
            return access.getXProperties()[key].visible
        })
        const columns = rows[0]
        if (columns.length > keys.length) {
            ElMessage({
                type: "warning",
                message: `${internation.translate("widget.tableForm.tooManyColumnsCopy", "所复制内容列数过多")}, ${internation.translate("widget.tableForm.reduceColumns", "请先减少列")}`
            })
            return
        } else if (columns.length < keys.length) {
            ElMessage({
                type: "warning",
                message: `${internation.translate("widget.tableForm.lessColumnsCopy", "所复制内容列数少于表格列数")}, ${internation.translate("widget.tableForm.addColumns", "请先增加列")}`
            })
            return
        }
        if (that.dumpsValueState().length >= 1) {
            that.spliceSubComponents(that.dumpsValueState().length - 1, 1)
        }
        for (let i = 0; i < rows.length; i++) {
            if (rows[i] != "") {
            // 如果某一行不是空，再按列拆分
            let columns = rows[i] // 已经按列划分
            let dataone = {}; // 声明一行数组
            for (let j = 0; j < columns.length; j++) {
                
                if (access.getProperties()[keys[j]].type === 'number') {
                    dataone[keys[j]] = columns[j] * 1;
                } else {
                    dataone[keys[j]] = columns[j];
                }
                if (access.getXProperties()[keys[j]].widget.type === 'select') {
                    dataone[keys[j]] = access.getXProperties()[keys[j]].widget.options.options.find(ele => ele.label == columns[j]).value
                }
            }
                that.addSubComponentWidthData(dataone)
            }
        }
    }

    /**
     * 删除行
     * @param index
     */
    deleteRow(index) {
        this.spliceSubComponents(index, 1)
    }

    /**
     * 复制一条
     * @param com
     * @param index
     */
    copyRow(com: WidgetComponent) {
        const data = com.dumpsValueState()
        this.addSubComponentWidthData(data)
    }

    /**
     * 创建simple-crud 表格操作列
     */
    createHandle() {
        const that = this
        this.expendCol({id: 'handle', label: internation.translate('widget.handel', '操作'), width: null,visible: true, render(row: ContainerComponent, index: number) {
                return <div class="line">
                    {   that.showDeleteButton.value ?
                            <el-button link={true} type="primary" onClick={() => {
                                that.deleteRow(index)
                            }}>{internation.translate('widget.delete', '删除')}</el-button> :
                            null
                    }
                    {
                        that.showCopyButton.value ?
                            <el-button link={true} type="primary" onClick={() => {
                                that.copyRow(row)
                            }}>{internation.translate('widget.copy', '复制')}</el-button> :
                            null
                    }
                </div>
            }})
    }

    override render() {
        if (!this.getAccessor().getVisible()) return null
        return <div class='table-form'>
            {
                this.showAddButton.value ?
                    <div class='add-button'>
                        <el-button type="info" onClick={() => {
                            this.addSubComponent();
                        }}>{internation.translate('widget.addNewItem', '新增一条')}</el-button>
                    </div> :
                    null
            }
            {
                super.render()
            }
        </div>
    }
}

defineWidget('table-form', (parent: WidgetComponent) => new TableForm(parent))
