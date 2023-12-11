/**
 * 复制
 * @param value
 */
export function copyToClipboard(value: string): void {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    // 将 textarea 添加到文档中
    document.body.appendChild(textArea);
    // 选中 textarea 中的文本
    textArea.select();
    // 复制文本到剪贴板
    document.execCommand("copy");
    // 移除 textarea 元素
    document.body.removeChild(textArea);
  }
  
/**
 * 根据文件路径获取文件名
 * @param filePath 
 */
export function getFileNameFromPath(filePath: string) {
 if (!filePath) {
    return '';
 }
 return filePath.split('/').pop();
}
/**
 * 获取文件后缀
 * @param fileName  文件名
 */
export function parseFileType(fileName: string) {
    if (!fileName) {
        return;
    }
    const fileExtension = fileName.split('.').pop();
    if (!fileExtension) {
        return;
    }
    if (['ts', 'js'].includes(fileExtension) ) {
        return 'typescript';
    } else if (['css', 'scss', 'less'].includes(fileExtension)) {
        return 'css';
    } else if (fileExtension === 'html') {
        return 'html';
    } else if (fileExtension === 'json') {
        return 'json';
    } else {
        return;
    }

}
