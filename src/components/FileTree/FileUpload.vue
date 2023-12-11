<template>
  <div class="file-operate" >
    <input
      ref="fileUploadRef"
      type="file"
      webkitdirectory
      directory
      multiple
      class="custom-file-input"
      @change="handleFolderUpload"
      >
      <div class="export" @click="exportFile">导出文件</div>
  </div>
</template>

<script setup lang='ts'>
import { FileTreeItem } from './constant';
import { generateAndZipFolder } from './utils/tree';
const props = defineProps<{ modelValue: FileTreeItem[] | undefined }>();
const emits = defineEmits(['update:modelValue']);
// 导出文件夹
async function exportFile() {
  if (!props.modelValue || props.modelValue.length === 0 ) {
    // ElMessage({
    //   showClose: true,
    //   message: "暂无文件",
    //   type: "error"
    // });
    return;
  }
    try {
        const res = await generateAndZipFolder(props.modelValue);
        // ElMessage({
        //   showClose: true,
        //   message: "已导出",
        //   type: "success"
        // });
    } catch(error) {
        console.error(error);
    }
}

/**
 * 
 * @param event 
 */
// let filesTree: FileTreeItem[] = [];
async function handleFolderUpload(event) {
  const fileList = event.target.files;
  const fileTree: FileTreeItem[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const path = file.webkitRelativePath;

    // 如果遇到node_modules就跳过
    if (path.includes('node_modules')) {
      continue;
    }
    const parts = path.split('/');
    let currentLevel = fileTree;

    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];
      const isDirectory = j < parts.length - 1;
          // path:  apps/server/app.ts

      let node: FileTreeItem | undefined = currentLevel.find((item) => item.label === part);
      // 如果当前层级没有此节点
      if (!node) {
        if (isDirectory) {
          const curFilePath = parts.slice(0, j + 1).join('/');
          node = {
            label: part,
            value: '',
            pathKey: curFilePath,
            children: []
          };
        } else {
          const fileContent = await readFile(file);
          node = {
            label: part,
            value: fileContent as string,
            pathKey: path
          };
        }
        currentLevel.push(node);
      }

      if (isDirectory) {
        currentLevel = node.children as [];
      }
    }
  }
  // 在这里可以对 fileTree 进行进一步处理或返回
  emits("update:modelValue", fileTree);

}
function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent) => {
      const fileContent = reader?.result;
      resolve(fileContent);
    };

    reader.onerror = (event) => {
      reject(event.target?.error);
    };

    reader.readAsText(file);
  });
}


</script>
<style scoped lang="scss">
.file-operate {
  display: flex;
  justify-content: space-around;
}
/* 主按钮的样式自定义 */
input[type="file"]::file-selector-button {
    height: 32px;
    font-size: 16px;
    color: #fff;
    border-radius: .25rem;
    border: 1px solid #2a80eb;
    // padding: .75rem 1rem;
    background-color: #2a80eb;
    box-sizing: border-box;
    font-family: inherit;
    cursor: pointer;
}
input[type="file"] {
  font-size: 0;
}
input[type="file"]:hover {
  cursor: pointer;
}
.export {
  background-color: #2a80eb;
  color: #fff;
  height: 32px;
  cursor: pointer;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: .25rem;
}
</style>