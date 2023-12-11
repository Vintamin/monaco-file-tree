// 生成树结构的el-tree
export interface BaseTree {
    id?: number;
    label?: string;
    children?: Tree[];
  }
  // 生成server的tree
export type Tree = IServerGroupInfo & BaseTree;

  // 获取server 接口列表
export interface IServerGroupInfo {
    type: string;
    name: string;
    title: string;
    groupId?: string;
    child?: IServerGroupInfo[];
    url?: string;
    apiId?: string;
  }