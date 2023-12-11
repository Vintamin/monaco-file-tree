<template>
  <div class="fileTreeArea">
      <FileUpload
        v-model="fileTreeData"
      />

      <FileTree
        ref="fileTreeRef"
        :data="fileTreeData"
        :props="defaultSelfProps"
        node-key ="pathKey"
        :expand-first-level = "props.expandFirstLevel"
        @node-click="handleNodeClick"
        @load-folder = "handleLoadFolder"
        />
  </div>
</template>

<script setup lang='ts'>
import { ref } from 'vue';
import FileUpload from './FileUpload.vue';
import { FileTreeItem } from './constant';
import FileTree from './Tree.vue';
import Node from './model/node';

interface IFileBoardProps {
    expandFirstLevel: boolean;
}
const emit = defineEmits<{
    (event: 'update:filePath', filePath: string): void;
}>();
const fileTreeRef = ref();
const props = defineProps<IFileBoardProps>();
const fileTreeData = ref<FileTreeItem[]>([]);
const handleNodeClick = (data: FileTreeItem, node: Node) => {
  
  // const filePathArr = computedPath(node);
  // // ['apps', 'server', 'app.ts']
  // emit('update:filePath', filePathArr);
  // const filePathArr = computedPath(node);
  // ['apps', 'server', 'app.ts']
  emit('update:filePath', data.pathKey); //  apps/server/app.ts

};
function passiveNodeClick(targetFilePath) {
  // targetFilePath: /apps/server/config/index.ts
  targetFilePath = targetFilePath.split('/').slice(1);
  emit('update:filePath', targetFilePath);
}
function computedPath(node: Node) {
  const path = [];
  const traversePath = (node: Node, pathArr: string[] = []) => {
    // 第二种情况是节点删除情况，节点删除后他的parent为null
    if (node.level === 0 || (node.level != 0 && !node.parent)) {
      // 重置路径为空，方便在ide中判断删除逻辑
      pathArr = [];
      // 如果没有parent了就返回
      return;
    }

    pathArr.unshift(node.data.label);
    traversePath(node.parent, pathArr);
  };
  traversePath(node, path);
  return path;
}
function handleLoadFolder() {
}
const defaultSelfProps = {
    children: 'children',
    label: 'label'
};

defineExpose({
  fileTreeRef,
  fileTreeData,
  handleNodeClick,
  passiveNodeClick
});

</script>
<style scoped lang="scss">
.fileTreeArea{
  height: 100%;
  max-height: 100%;
  max-width:300px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  overflow: auto;
  // background-color: #1f1f1f;
}
</style>