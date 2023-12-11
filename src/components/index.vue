<template>
  <keep-alive>
    <div class="code-ide"
      :style="{height:props.height,width:props.width}">
          <FileBoard
            ref="FileBoardRef"
            v-model:filePath="filePath"
            class="fileArea"
            :expand-first-level = "true"
          />
        <MonacoEdit
          :file-path="filePath"
          :lang="langType"
          @saveCode = "handleSaveCode"
          @toFileNode = "handleToFile"
          />
    </div>
  </keep-alive>

  </template>

<script setup lang='ts'>
import FileBoard from './FileTree/index.vue';
import MonacoEdit from './Monaco/index.vue';
import { parseFileType, getFileNameFromPath } from './utils';
import { ref, watch, provide } from 'vue';
interface IProps{
  height:string;
  width:string;
}
const props = withDefaults(defineProps<IProps>(),{
  height:'100%',
  width:'100%'
	})

const langType = ref('');
const FileBoardRef = ref();
const fileDataTree = ref();
const filePath = ref();
provide('fileTreeData', fileDataTree);

function handleSaveCode(newVal) {
  const currentNode = FileBoardRef.value.fileTreeRef.getCurrentNode();
  if (currentNode) {
    currentNode.data.value = newVal;
  }

}
// 通过编辑器内跳转过去
function handleToFile(targetFilePath) {
  // 编辑器内被动跳转逻辑
  targetFilePath = targetFilePath.slice(1);
  FileBoardRef.value.fileTreeRef.setCurrentKey(targetFilePath);
}

watch(() => FileBoardRef.value?.fileTreeData, (newVal) => {

  if (newVal.length) {
    fileDataTree.value = newVal;
  }
});
watch(filePath, (newVal) => {
  const fileName = getFileNameFromPath(newVal);
  const fileType = parseFileType(fileName ?? '');
  if (fileType) {
    langType.value = fileType;
  }
});
</script>
<style scoped lang="scss">
.code-ide{
  height: 100%;
  width: 100%;
  display: flex;
  border: 1px solid black;
  img{
    height: 50px;
    width: 50px;
  }
  .fileArea {

  }

}
</style>