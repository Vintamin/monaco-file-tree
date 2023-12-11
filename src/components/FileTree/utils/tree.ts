import JSZip from "jszip";
// import fs from 'fs';
import {BaseTree} from '../type'

// 忽略MAC系统的系统文件
const MAC_DEFAULT_DIR = "__MACOSX";


// 文件树结构
export interface IFileTree {
  label?: string;
  children: IFileTree[];
  value?: any;
}
/**
 * 加载zip文件夹
 */
export async function readZipFile() {
  const currentFileUrl = import.meta.url;
  const relativePath = "../test/kwai-task-list.zip";
  const filePath = new URL(relativePath, currentFileUrl).href;
  const zip = new JSZip();
  const blob = await getFileBlob(filePath);
  try {
    const zipData = (await readFileContent(blob as Blob)) as ArrayBuffer;
    await zip.loadAsync(zipData);
    const res = await createFileTree(zip.files);
    return res;
  } catch(error) {
    console.error("Failed to read the zip file:", error);
  }
  /**
   * 获取文件blob
   * @param url
   * @returns
   */
  function getFileBlob(url: string) {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then((response) => response.blob())
        .then((blob) => {
          return resolve(blob);
        })
        .catch((error) => reject(error));
    });
  }
  /**
   * 读取文件内容的辅助函数
   * @param blob
   * @returns
   */
  function readFileContent(blob: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target!.result);
      };
      reader.onerror = (event) => {
        reject(new Error(`Failed to read : ${event.target!.error}`));
      };
      reader.readAsArrayBuffer(blob);
    });
  }
  /**
   * 生成文件树
   * @param files
   * @returns
   */
  async function createFileTree(files: { [key: string]: JSZip.JSZipObject }) {
    const fileTree: BaseTree = {};
    const filesArr = Object.entries(files);
    for (const [index, arr]of filesArr.entries()) {
      const fileName = arr[0];
      const fileContent = arr[1];
      if (fileName.includes(MAC_DEFAULT_DIR)) {
      } else {
        let nameArr = fileName.split("/");
        // 去除最后一项为''的项
        if (!nameArr[nameArr.length - 1]) {
          nameArr = nameArr.slice(0, -1);
        }
        await createTreeFromArray(nameArr, fileTree, fileContent, index);
      }
    }
    return fileTree.children;
  }
}
/**
 * 构建tree结构
 * @param nameArr
 * @param fileTree
 * @param fileContent
 */
async function createTreeFromArray(nameArr: string[], fileTree: Object, fileContent: JSZip.JSZipObject, index) {
  let currentLevel: BaseTree = fileTree;

  const isDir = fileContent.dir;

  for (let j = 0; j < nameArr.length; j++) {
    const label = nameArr[j];
    if (!currentLevel.children && isDir) {
      currentLevel.children = [];
    }
    // 查找是否已存在label节点
    let node: any = currentLevel.children?.find((child) => child.label === label);
    // 如果不存在则新建
    if (!node) {
      if (isDir) {
        // 文件夹
        node = { label: label, children: [], id: index, isLeaf: false };
      } else {
        const strContent = await fileContent.async("string");
        //
        // 文件
        node = { label: label, value: strContent, id: index, isLeaf: true };
      }

      currentLevel.children?.push(node);
    }
    // 向下遍历
    currentLevel = node;
  }
}
/**
 *  追加时选择层级的ID，返回的是层级的id数组
 * @param node
 * @param levelIdArr
 * @returns string[]
 */
export function getLevelID(node, levelIdArr: string[]) {
  if (!node.parent) {
    return;
  }
  const id = node.data.groupId;
  levelIdArr.unshift(id);
  getLevelID(node.parent, levelIdArr);
}


/**
 * 遍历数组信息生成zip文件夹
 * @param data
 */
export async function generateAndZipFolder(data) {

  const zip = new JSZip();
  const baseFolderName = data[0].label;

  async function addFilesToZip(_zip, basePath, items) {
    for (const item of items) {
      // const itemPath = basePath ? `${basePath}/${item.label}` : item.label;
      const itemPath = item.label;
      if (item.children && item.children.length) {
        // 如果当前项有 children，则创建文件夹并递归生成子项
        const folder = _zip.folder(item.label);
         await addFilesToZip(folder, itemPath, item.children);
      } else {
        // 如果当前项没有 children，则添加文件
        _zip.file(itemPath, item.value);
      }
    }
  }

  await addFilesToZip(zip, '', data);

  zip.generateAsync({ type: 'blob' })
  .then(content => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${baseFolderName}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  });

}


