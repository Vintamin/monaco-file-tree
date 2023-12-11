export enum HandleFileType {
    File,
    Folder
}
export interface FileTreeItem {
    label: string,
    value: string,
    pathKey: string, // 路径作为key
    children?: Array<any>
}