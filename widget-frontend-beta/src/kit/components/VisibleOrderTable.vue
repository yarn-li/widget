<template>
    <div class="visible-order-container">
        <div style="height: calc(100% - 20px);">
            <el-table ref="dragTable" height="100%" :data="value" fit row-key="id" highlight-current-row style="width: 100%"
                @selection-change="handleSelectionChange" size="small">
                <el-table-column type="selection" width="55" />
                <el-table-column align="center" :label="internation.translate('widget.columnNames', '列名')" prop="label" min-width="180" show-overflow-tooltip>
                </el-table-column>
                <el-table-column align="center" :label="internation.translate('widget.fixedColumn', '固定列')" min-width="120">
                <template #default="scope">
                    <el-radio-group v-model="scope.row.fixed" size="default">
                    <el-radio-button label="left">
                        <template #default>
                        <el-image class="svg-icon" :src="fixedLeft" style="width: 16px; width: 16px;" />
                        </template>
                    </el-radio-button>
                    <el-radio-button :label="false">
                        <template #default>
                        <img class="svg-icon" :src="fixedDefault" style="width: 16px; height: 16px;" />
                        </template>
                    </el-radio-button>
                    <el-radio-button label="right">
                        <template #default>
                        <el-image class="svg-icon" :src="fixedRigth" style="width: 16px; height: 16px;" />
                        </template>
                    </el-radio-button>
                    </el-radio-group>
                </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script setup>
import { Aim, Rank } from '@element-plus/icons-vue';
import { computed, toRef, ref, nextTick, defineExpose, onMounted } from "vue";
import {internation} from "@widget-frontend/widget-frontend-core";
import Sortable from "sortablejs";

import fixedLeft from "../../assets/images/fixedLeft.svg";
import fixedDefault from "../../assets/images/fixedDefault.svg";
import fixedRigth from "../../assets/images/fixedRight.svg";


const title = ref('显示/隐藏');
const open = ref(false);
const CheckBtn = ref();

const props = defineProps(['showSearch', 'columns', 'visibleButton', 'gutter', 'tabelkey', 'cachekey']);
const gutter = toRef(props, 'gutter');
const columns = toRef(props, 'columns');
console.log(columns);
const visibleButton = toRef(props, 'visibleButton');

const emits = defineEmits(['update:showSearch', 'queryTable', 'updateColumns']);

const value = ref(columns.value);
const dragTable = ref();
const isInit = ref(false);

const style = computed(() => {
  const ret = {};
  if (gutter.value) {
    ret.marginRight = `${this.gutter / 2}px`;
  }
  return ret;
});

// 搜索
function toggleSearch() {
  emits('update:showSearch', !showSearch.value);
}

// 刷新
function refresh() {
  emits('queryTable');
}

// 右侧列表元素变化
function dataChange(data) {
  emits('updateColumns', data);
}


// 打开显隐列dialog
onMounted(() => {
  open.value = true;
  isInit.value = false;
  nextTick(() => {
    columns.value.forEach(row => {
      if (row.visible) {
        dragTable.value.toggleRowSelection(row, undefined);
      }
    });
    rowDrop();
    isInit.value = true;
  });
});

function handleClose() {
  open.value = false;
}

function submit() {
  open.value = false;
}

function rowDrop() {
  // 要侦听拖拽响应的DOM对象（数据存储在.el-table__body-wrapper > .el-table__row > tbody标签中（el-table的数据部分的“最外层”class名为el-table__body-wrapper））
  const tbody = document.querySelector('.visible-order-container tbody');
  Sortable.create(tbody, {
    // 结束拖拽后的回调函数
    onEnd({ newIndex, oldIndex }) {
      console.log('拖动了行，序号(index)"' + oldIndex + '"拖动到序号(index)"' + newIndex + '"');
      const currentRow = value.value.splice(oldIndex, 1)[0]; // 将oldIndex位置的数据删除并取出，oldIndex后面位置的数据会依次前移一位
      value.value.splice(newIndex, 0, currentRow); // 将被删除元素插入到新位置（currRow表示上面的被删除数据）
      dataChange(value.value);
    }
  });
}

function handleSelectionChange(selection) {
  if (isInit.value) {
    const propList = selection.map(ele => ele.id);
    value.value.forEach(ele => {
      ele.visible = propList.includes(ele.id);
    });
  }
}

</script>

<style>
.sortable-ghost {
  opacity: .8;
  color: #fff !important;
  background: #409EFF !important;
}

.svg-icon {
  filter: drop-shadow(#969799 300px 0);
  transform: translateX(-300px);
}

.el-radio-button:hover .svg-icon {
  filter: drop-shadow(var(--w-primary-color) 300px 0);
  transform: translateX(-300px);
}

.is-active.el-radio-button:hover .svg-icon {
  filter: drop-shadow(#fff 300px 0);
  transform: translateX(-300px);
}

.is-active .svg-icon {
  filter: drop-shadow(#fff 300px 0);
  transform: translateX(-300px);
}

.el-table .cell {
    font-size: 12px !important;
}

.el-table thead>tr>th{
    font-size: 12px;
    color: #333;
}

.el-table tbody>tr>td{
    font-size: 12px;
    color: #666;
}

</style>

<style lang="scss" scoped>



.el-radio-group {
  overflow: hidden;

}

:deep(.el-radio-button__inner) {
  border-radius: 0 !important;
  padding: 8px;
}

.svg-icon {
  vertical-align: middle;
}

.visible-order-container {
  position: relative;
  height: 100%;
}

::v-deep .el-table__row {
  cursor: move;
}

::v-deep .el-table .cell {
  color: #333 !important;
}

.el-transfer {
  display: flex;
  justify-content: center;
  align-items: center;

  :deep(.el-transfer-panel) {
    width: 300px;
  }
}

.footer {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-star {
  margin-right: 2px;
}

.drag-handler {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.show-d {
  margin-top: 15px;
}

:deep(.el-transfer__button) {
  display: block;
  width: 40px;
  height: 40px;
  padding: 10px;
  border-radius: 50%;
}

:deep(.el-transfer__button):first-child {
  margin-left: 10px;
  margin-bottom: 10px;
}
</style>