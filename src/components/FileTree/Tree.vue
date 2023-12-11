<template>
    <div
      ref="fileTreeRef"
      role="tree"
      class="fileTreeContent"
      @contextmenu="handleContextMenu"
    >
      <File-tree-node
        v-for="child in root.childNodes"
        :key="getNodeKey(child)"
        :node="child"
        :self-props="props"
        :accordion="accordion"
        :render-content="renderContent"
        @node-expand="handleNodeExpand"
      />
    <!-- menu菜单 -->
    <FileMenu
      :visible="isShowMenu"
      :file-menu-client-x="fileMenuClientX"
      :file-menu-client-y ="fileMenuClientY"
      :is-base-file-area ="true"
      @click-create-folder="handleCreateFile(HandleFileType.Folder)"
      @click-createfile="handleCreateFile(HandleFileType.File)"
      @click-menu-mask="clickMaskLayer"
    />
      <div v-if="isEmpty" class="empty">
          <el-empty description="暂无文件" />
      </div>
    </div>

</template>
<script lang="ts">
import {
  computed,
  defineComponent,
  getCurrentInstance,
  provide,
  ref,
  watch
} from 'vue';
import TreeStore from './model/tree-store';
import { getNodeKey as getNodeKeyUtil, handleCurrentChange } from './model/common';
import FileTreeNode from './TreeNode.vue';
import { useNodeExpandEventBroadcast } from './model/useNodeExpandEventBroadcast';
import type Node from './model/node';
import type { ComponentInternalInstance, PropType } from 'vue';
import type { Nullable } from './utils';
import type {
  TreeComponentProps,
  TreeData,
  TreeKey,
  TreeNodeData
} from './TreeType';
import FileMenu from './FileMenu.vue';
import { HandleFileType, FileTreeItem } from './constant';

export default defineComponent({
  name: 'ElTree',
  components: { FileTreeNode, FileMenu },
  props: {
    data: {
      type: Array,
      default: () => []
    },
    emptyText: {
      type: String
    },
    nodeKey: {
      type: String,
      default: 'id'
    },
    checkStrictly: Boolean,
    defaultExpandAll: Boolean,
    expandFirstLevel: {
      type: Boolean,
      default: true
    },
    expandOnClickNode: {
      type: Boolean,
      default: true
    },
    checkOnClickNode: Boolean,
    checkDescendants: {
      type: Boolean,
      default: false
    },
    currentNodeKey: {
      type: [String, Number] as PropType<string | number>
    },
    renderContent: Function,
    props: {
      type: Object as PropType<TreeComponentProps['props']>,
      default: () => ({
        children: 'children',
        label: 'label',
        disabled: 'disabled'
      })
    },
    highlightCurrent: Boolean,
    accordion: Boolean,
    indent: {
      type: Number,
      default: 18
    },
    icon: {
    }
  },
  emits: [
    'check-change',
    'current-change',
    'node-click',
    'node-contextmenu',
    'node-collapse',
    'node-expand',
    'load-folder'
  ],
  setup(props, ctx) {
    const store = ref<TreeStore>(
      new TreeStore({
        key: props.nodeKey,
        data: props.data as any,
        props: props.props,
        currentNodeKey: props.currentNodeKey as TreeKey,
        checkStrictly: props.checkStrictly,
        checkDescendants: props.checkDescendants,
        defaultExpandAll: props.defaultExpandAll,
        expandFirstLevel: props.expandFirstLevel
      })
    );

    store.value.initialize();

    const root = ref<Node>(store.value.root);
    const currentNode = ref<Node>();
    const currentRightClickNode = ref<Node>();
    const fileTreeRef = ref<Nullable<HTMLElement>>(null);
    const dropIndicator$ = ref<Nullable<HTMLElement>>(null);
    // menu
    const isShowMenu = ref(false);
    // menu位置
    const fileMenuClientX = ref(0);
    const fileMenuClientY = ref(0);

    const { broadcastExpanded } = useNodeExpandEventBroadcast(props);

    const isEmpty = computed(() => {
      const { childNodes } = root.value;
      return (
        !childNodes ||
        childNodes.length === 0 ||
        childNodes.every(({ visible }) => !visible)
      );
    });

    watch(
      () => props.currentNodeKey,
      (newVal) => {
        store.value.setCurrentNodeKey(newVal);
      }
    );

    watch(
      () => props.data,
      (newVal) => {
        store.value.setData(newVal as any[]);
      },
      { deep: true }
    );

    watch(
      () => props.checkStrictly,
      (newVal) => {
        store.value.checkStrictly = newVal;
      }
    );

    const handleLoadFolder = () => {
      ctx.emit('load-folder');
    };

    const getNodeKey = (node: Node) => {
      return getNodeKeyUtil(props.nodeKey ?? '', node.data);
    };

    const getNodePath = (data: TreeKey | TreeNodeData) => {
      if (!props.nodeKey)
        throw new Error('[Tree] nodeKey is required in getNodePath');
      const node = store.value.getNode(data);
      if (!node) return [];
      const path = [node.data];
      let parent = node.parent;
      while(parent && parent !== root.value) {
        path.push(parent.data);
        parent = parent.parent;
      }
      return path.reverse();
    };

    const getCheckedNodes = (
      leafOnly?: boolean,
      includeHalfChecked?: boolean
    ): TreeNodeData[] => {
      return store.value.getCheckedNodes(leafOnly, includeHalfChecked);
    };

    const getCheckedKeys = (leafOnly?: boolean): TreeKey[] => {
      return store.value.getCheckedKeys(leafOnly);
    };

    const getCurrentNode = (): Node | null => {
      const currentNode = store.value.getCurrentNode();
      return currentNode ? currentNode : null;
    };

    const getCurrentKey = (): any => {
      if (!props.nodeKey)
        throw new Error('[Tree] nodeKey is required in getCurrentKey');
      const currentNode = getCurrentNode();
      return currentNode ? currentNode[props.nodeKey] : null;
    };

    const setCheckedNodes = (nodes: Node[], leafOnly?: boolean) => {
      if (!props.nodeKey)
        throw new Error('[Tree] nodeKey is required in setCheckedNodes');
      store.value.setCheckedNodes(nodes, leafOnly);
    };

    const setCheckedKeys = (keys: TreeKey[], leafOnly?: boolean) => {
      if (!props.nodeKey)
        throw new Error('[Tree] nodeKey is required in setCheckedKeys');
      store.value.setCheckedKeys(keys, leafOnly);
    };

    const setChecked = (
      data: TreeKey | TreeNodeData,
      checked: boolean,
      deep: boolean
    ) => {
      store.value.setChecked(data, checked, deep);
    };

    const setCurrentNode = (node: Node, shouldAutoExpandParent = true) => {
      if (!props.nodeKey)
        throw new Error('[Tree] nodeKey is required in setCurrentNode');
      // @ts-ignore
      handleCurrentChange(store, ctx.emit, () =>
        store.value.setUserCurrentNode(node, shouldAutoExpandParent)
      );
    };

    const setCurrentKey = (key?: TreeKey, shouldAutoExpandParent = true) => {
      if (!props.nodeKey)
        throw new Error('[Tree] nodeKey is required in setCurrentKey');
      // @ts-ignore
      handleCurrentChange(store, ctx.emit, () =>
        store.value.setCurrentNodeKey(key, shouldAutoExpandParent)
      );
    };

    const getNode = (data: TreeKey | TreeNodeData): Node => {
      return store.value.getNode(data);
    };

    const remove = (data: TreeNodeData | Node) => {
      store.value.remove(data);
    };

    const append = (
      data: TreeNodeData,
      parentNode: TreeNodeData | TreeKey | Node
    ) => {
      store.value.append(data, parentNode);
    };

    const insertBefore = (
      data: TreeNodeData,
      refNode: TreeKey | TreeNodeData | Node
    ) => {
      store.value.insertBefore(data, refNode);
    };

    const insertAfter = (
      data: TreeNodeData,
      refNode: TreeKey | TreeNodeData | Node
    ) => {
      store.value.insertAfter(data, refNode);
    };

    const handleNodeExpand = (
      nodeData: TreeNodeData,
      node: Node,
      instance: ComponentInternalInstance
    ) => {
      broadcastExpanded(node);
      ctx.emit('node-expand', nodeData, node, instance);
    };

    const updateKeyChildren = (key: TreeKey, data: TreeData) => {
      if (!props.nodeKey)
        throw new Error('[Tree] nodeKey is required in updateKeyChild');
      store.value.updateChildren(key, data);
    };
    // /**文件操作 */
    const handleContextMenu = (event: MouseEvent) => {
      // if (!props.data.length) {
      //   return;
      // }
      // event.stopPropagation();
      // event.preventDefault();
      // const roleAttribute = (event.target as HTMLElement).getAttribute('role');
      // if (roleAttribute && roleAttribute === 'mask') {
      //   return;
      // }
      // isShowMenu.value = true;
      // fileMenuClientX.value = event.clientX;
      // fileMenuClientY.value = event.clientY;
    };
    const handleCreateFile = (type: HandleFileType) => {
      const newData: FileTreeItem = {
        label: '',
        value: '',
        pathKey: ''
      };
      if (type === HandleFileType.Folder) {
        newData.children = [];
      }
      const currentChildSum = root.value.childNodes.length;
      const lastNode = root.value.childNodes[currentChildSum - 1];
      store.value.insertAfter(newData, lastNode);
      isShowMenu.value = false;
      const newNode = root.value.childNodes[currentChildSum];
      // 重置当前currentNode
      store.value.setCurrentNode(newNode);
      store.value.setCurrentRightClickNode(newNode);
    };
    const clickMaskLayer = (event: MouseEvent) => {
      isShowMenu.value = false;
    };
    const handleUploadFile = () => {

    };

    provide('RootTree', {
      ctx,
      props,
      store,
      root,
      currentNode,
      currentRightClickNode,
      instance: getCurrentInstance()
    } as any);


    return {
      // ref
      store,
      root,
      currentNode,
      currentRightClickNode,
      fileTreeRef,
      dropIndicator$,

      // computed
      isEmpty,

      // methods
      handleLoadFolder,
      getNodeKey,
      getNodePath,
      getCheckedNodes,
      getCheckedKeys,
      getCurrentNode,
      getCurrentKey,
      setCheckedNodes,
      setCheckedKeys,
      setChecked,
      setCurrentNode,
      setCurrentKey,
      getNode,
      remove,
      append,
      insertBefore,
      insertAfter,
      handleNodeExpand,
      updateKeyChildren,
      // menu 文件操作
      fileMenuClientX,
      fileMenuClientY,
      handleContextMenu,
      isShowMenu,
      handleCreateFile,
      clickMaskLayer,
      HandleFileType,
      handleUploadFile
    };
  }
});
</script>
<style scoped lang="scss">
  .fileTreeContent {
    height: 100%;
    // background-color: #E6E6E6;
    position: relative;
    .empty {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%,-50%);
    }
  }

</style>./TreeType